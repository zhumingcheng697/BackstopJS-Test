const fs = require("fs");
const open = require("open");
const path = require("path");
const playwright = require("playwright");

const { reportSourceFilePath, logStyle, BrowserName, resolveBrowserList, forEachFile } = require("./helper");

/**
 * Whether to render PDF for the report.
 *
 * @type {boolean}
 */
const shouldRenderPDF = !!process.env.PDF;

/**
 * Combines all config.js reports into one file.
 *
 * @param browsers {string[]}
 * @returns {void}
 */
function combineReports(browsers = []) {
    /**
     * Extracts tests from config.
     *
     * @param config {string}
     * @returns {string[]}
     */
    function extractedTests(config) {
        let leftIndex = config.indexOf("[");
        let rightIndex = config.lastIndexOf("]");
        leftIndex = config.indexOf("{", leftIndex);
        rightIndex = config.lastIndexOf("}", rightIndex);

        return config.slice(leftIndex + 1, rightIndex).replace(/([^\\]": ")(?:\.\.\/){3}(?!\.\.\/)/g, `$1../../../backstop_data/`).replace(/([^\\]": ")(?:\.\.\/){4}(?!\.\.\/)/g, `$1../../../`).split(/}\s*,\s*{/).filter((test) => test.includes(`"status": "fail"`));
    }

    /**
     * Copies files recursively from source to destination if file does not exist.
     *
     * @param src {string}
     * @param dest {string}
     * @returns {void}
     */
    function copyNewFiles(src, dest) {
        forEachFile(src, (srcDir) => {
            const destDir = srcDir.replace(src, dest);

            try {
                const parentDir = destDir.slice(0, destDir.lastIndexOf("/"));
                if (!fs.existsSync(parentDir)) {
                    fs.mkdirSync(parentDir, { recursive: true });
                }
                if (!fs.existsSync(destDir)) {
                    fs.copyFileSync(srcDir, destDir);
                }
            } catch (e) {
                console.error(`${logStyle.fg.red}Failed to copy files from ${srcDir} to ${destDir}:\n${e}${logStyle.reset}`);
            }
        });
    }

    /**
     * Renders a PDF from source and save it to destination.
     *
     * @param src {string}
     * @param dest {string}
     * @returns {void}
     */
    async function renderPDF(src, dest) {
        const browser = await playwright.chromium.launch({
            ignoreHTTPSErrors: true,
            headless: true
        });
        const page = await browser.newPage();
        await page.goto(src);
        await page.emulateMedia({ media: "screen" });
        const pageSize = await page.evaluate(async () => {
            const sleep = (ms) => {
                return new Promise((resolve) => {
                    setTimeout(resolve, ms);
                });
            };

            const header = document.querySelector("#root > div > section.header > div > section");
            const headerPadding = document.querySelector("#root > div > section.header > div > div");
            document.body.style.background = "none";
            document.querySelector("#root > div > section.header").style.background = "#E2E7EA";
            document.addEventListener("scroll", () => {
                header.style.position = "relative";
                header.style.top = "0px";
                header.style.left = "0px";
                headerPadding.style.marginBottom = `-${window.getComputedStyle(headerPadding).paddingBottom}`;
            });

            const distanceToBottom = () => (document.documentElement.scrollHeight - window.innerHeight - document.documentElement.scrollTop);
            while (distanceToBottom() > 5) {
                window.scrollBy(0, 150);
                await sleep(20);
            }
            await sleep(100);
            return { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight };
        });

        await page.pdf({
            path: dest,
            printBackground: true,
            width: pageSize.width,
            height: pageSize.height,
            pageRanges: "1"
        });
        await browser.close();
    }

    for (const browserType of resolveBrowserList(browsers)) {
        try {
            const currentTime = new Date();
            const pathForBrowser = `backstop_data/html_report/${browserType}`;
            const outputPath = `combined_report/${browserType}/${currentTime.toISOString().replace(/[:.]/g, `-`)}`;

            if (!fs.existsSync(outputPath)) {
                fs.mkdirSync(outputPath, { recursive: true });
            }

            const configPrefix = `report({
  "testSuite": "${BrowserName[browserType]}",
  "id": "Combined at ${currentTime.toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                weekday: "short",
                hour: "numeric",
                minute: "numeric",
                timeZoneName: "short"
            })}",
  "tests": [`;
            const configSuffix = `]
});`;

            try {
                fs.writeFileSync(`${outputPath}/config.js`, configPrefix);

                if (fs.existsSync(pathForBrowser)) {
                    let isFirstGroup = true;
                    for (const dir of fs.readdirSync(pathForBrowser, { withFileTypes: true })) {
                        if (dir.isDirectory()) {
                            const pathForConfig = `${pathForBrowser}/${dir.name}/config.js`;

                            if (fs.existsSync(pathForConfig)) {
                                try {
                                    const config = fs.readFileSync(pathForConfig, "utf8");

                                    for (const failedTest of extractedTests(config)) {
                                        if (isFirstGroup) {
                                            isFirstGroup = false;
                                        } else {
                                            fs.appendFileSync(`${outputPath}/config.js`, ", ");
                                        }

                                        fs.appendFileSync(`${outputPath}/config.js`, "{");
                                        fs.appendFileSync(`${outputPath}/config.js`, failedTest);
                                        fs.appendFileSync(`${outputPath}/config.js`, "}");
                                    }
                                } catch (e) {
                                    console.error(`${logStyle.fg.red}Failed to copy ${browserType} test files from "${pathForConfig}" to ${outputPath}:\n${e}${logStyle.reset}`);
                                }
                            }
                        }
                    }
                }

                fs.appendFileSync(`${outputPath}/config.js`, configSuffix);
            } catch (e) {
                console.error(`${logStyle.fg.red}Failed to write ${browserType} test files to ${outputPath}:\n${e}${logStyle.reset}`);
                return;
            }

            if (fs.existsSync(reportSourceFilePath)) {
                try {
                    copyNewFiles(reportSourceFilePath, outputPath);
                    open(`${outputPath}/index.html`);
                    console.log(`${logStyle.fg.green}Combined report generated successfully for ${browserType}${logStyle.reset}`);

                    if (shouldRenderPDF) {
                        const filePath = "file://" + path.join(__dirname, `${outputPath}/index.html`);
                        renderPDF(filePath, `${outputPath}/report.pdf`)
                            .then(() => {
                                console.log(`${logStyle.fg.green}PDF report rendered successfully for ${browserType}${logStyle.reset}`);
                                open(`${outputPath}/report.pdf`);
                            }).catch((e) => {
                            console.error(`${logStyle.fg.red}An error occurred when rendering PDF report for ${browserType}:\n${e}${logStyle.reset}`);
                        });
                    }
                } catch (e) {
                    console.error(`${logStyle.fg.red}An error occurred when copying source files:\n${e}${logStyle.reset}`);
                    return;
                }
            } else {
                console.error(`${logStyle.fg.red}Source files missing from "${reportSourceFilePath}"${logStyle.reset}`);
                return;
            }
        } catch (e) {
            console.error(`${logStyle.fg.red}An error occurred when accessing ${browserType} test files:\n${e}${logStyle.reset}`);
            return;
        }
    }

    if (shouldRenderPDF) {
        console.log(`Rendering PDF report`);
    }
}


if (require.main === module) {
    combineReports(process.argv.slice(2));
}

module.exports = combineReports;
