const fs = require("fs");

const logRed = "\x1b[31m";
const logGreen = "\x1b[32m";
const logReset = "\x1b[0m";

/**
 * Combines all config.js reports into one file
 *
 * @returns {void}
 */
function combineReports() {
    /**
     * Extracts tests from config.
     *
     * @param config {string}
     * @returns {string}
     */
    function extractedTests(config) {
        const leftIndex = config.indexOf("[");
        const rightIndex = config.lastIndexOf("]");

        const allTests = config.slice(leftIndex + 1, rightIndex).replace(/(?:\.\.\/){3}/g, "../../backstop_data/");
        return allTests.split(/}[\n\s]*,[\n\s]*{/).filter((test) => test.includes(`"status": "fail"`)).join(`}, {`);
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

    for (const browserType of ["chromium", "firefox", "webkit"]) {
        try {
            const pathForBrowser = `backstop_data/html_report/${browserType}`;
            const testsForBrowser = [];

            if (fs.existsSync(pathForBrowser)) {
                for (const dir of fs.readdirSync(pathForBrowser, { withFileTypes: true })) {
                    if (dir.isDirectory()) {
                        const pathForConfig = `${pathForBrowser}/${dir.name}/config.js`;

                        if (fs.existsSync(pathForConfig)) {
                            const config = fs.readFileSync(pathForConfig, "utf8");
                            testsForBrowser.push(extractedTests(config));
                        }
                    }
                }
            }

            const outputPath = `combined_report/${browserType}`;

            if (!fs.existsSync(outputPath)) {
                if (!fs.existsSync("combined_report")) {
                    fs.mkdirSync("combined_report");
                }
                fs.mkdirSync(outputPath);
            }

            const outputConfig = `report({
  "testSuite": "BackstopJS",
  "tests": [` + testsForBrowser.join(",") + `]
});`;
            try {
                fs.writeFileSync(`${outputPath}/config.js`, outputConfig);
            } catch (e) {
                console.error(`${logRed}Failed to write ${browserType} test files to ${outputPath}:\n${e}${logReset}`);
                return;
            }

            const fileSource = "node_modules/backstop-playwright/compare/output";
            if (fs.existsSync(fileSource)) {
                try {
                    copyNewFiles(fileSource, outputPath);
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
    combineReports();
}

module.exports = combineReports;
