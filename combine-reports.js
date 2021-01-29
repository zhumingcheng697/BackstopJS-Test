const fs = require("fs");
const open = require("open");

const logRed = "\x1b[31m";
const logGreen = "\x1b[32m";
const logReset = "\x1b[0m";

/**
 * Browser names.
 *
 * @type {Object.<string, string>}
 */
const BrowserName = {
    chromium: "Chromium",
    firefox: "Firefox",
    webkit: "WebKit"
};

/**
 * Combines all config.js reports into one file
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

        const allTests = config.slice(leftIndex + 1, rightIndex).replace(/(?:\.\.\/){3}/g, "../../backstop_data/");
        return allTests.split(/}[\n\s]*,[\n\s]*{/).filter((test) => test.includes(`"status": "fail"`));
    }

    /**
     * Copies files recursively from source to destination if file does not exist
     *
     * @param src {string}
     * @param dest {string}
     * @returns {void}
     */
    function copyNewFiles(src, dest) {
        if (!fs.existsSync(src)) {
            return;
        }

        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }

        for (const dir of fs.readdirSync(src, { withFileTypes: true })) {
            const srcDir = `${src}/${dir.name}`;
            const destDir = `${dest}/${dir.name}`;

            try {
                if (dir.isDirectory()) {
                    copyNewFiles(srcDir, destDir);
                } else {
                    if (!fs.existsSync(destDir)) {
                        fs.copyFileSync(srcDir, destDir);
                    }
                }
            } catch (e) {
                console.error(`${logRed}Failed to copy files from ${srcDir} to ${destDir}:\n${e}${logReset}`);
            }
        }
    }

    browsers = browsers.reduce((prev, curr) => {
        if (BrowserName[curr.toLowerCase()]) {
            prev.push(curr.toLowerCase());
        } else if (curr.toLowerCase() === "c") {
            prev.push("chromium");
        } else if (curr.toLowerCase() === "f") {
            prev.push("firefox");
        } else if (curr.toLowerCase() === "w") {
            prev.push("webkit");
        }

        return prev;
    }, []);

    if (!browsers.length) {
        browsers = ["chromium", "firefox", "webkit"];
    }

    for (const browserType of browsers) {
        try {
            const pathForBrowser = `backstop_data/html_report/${browserType}`;
            const outputPath = `combined_report/${browserType}`;

            if (!fs.existsSync(outputPath)) {
                if (!fs.existsSync("combined_report")) {
                    fs.mkdirSync("combined_report");
                }
                fs.mkdirSync(outputPath);
            }

            const configPrefix = `report({
  "testSuite": "${BrowserName[browserType]}",
  "id": "Combined at ${(new Date()).toLocaleString(undefined, {
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
                                    console.error(`${logRed}Failed to copy ${browserType} test files from "${pathForConfig}" to ${outputPath}:\n${e}${logReset}`);
                                }
                            }
                        }
                    }
                }

                fs.appendFileSync(`${outputPath}/config.js`, configSuffix);
            } catch (e) {
                console.error(`${logRed}Failed to write ${browserType} test files to ${outputPath}:\n${e}${logReset}`);
                return;
            }

            const fileSource = "node_modules/backstop-playwright/compare/output";
            if (fs.existsSync(fileSource)) {
                try {
                    copyNewFiles(fileSource, outputPath);
                    open(`${outputPath}/index.html`);
                } catch (e) {
                    console.error(`${logRed}An error occurred when copying source files:\n${e}${logReset}`);
                    return;
                }
            } else {
                console.error(`${logRed}Source files missing from "node_modules/backstop-playwright/compare/output"${logReset}`);
                return;
            }
        } catch (e) {
            console.error(`${logRed}An error occurred when accessing ${browserType} test files:\n${e}${logReset}`);
            return;
        }
    }

    console.log(`${logGreen}Combined report generated successfully${logReset}`);
}


if (require.main === module) {
    combineReports(process.argv.slice(2));
}

module.exports = combineReports;
