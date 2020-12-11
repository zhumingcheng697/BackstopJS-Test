const fs = require("fs");

const combinedTests = [];

/**
 * Extracts tests from config
 *
 * @param config {string}
 * @returns {string}
 */
function extractedTests(config) {
    const leftIndex = config.indexOf("[");
    const rightIndex = config.lastIndexOf("]");

    const allTests = config.slice(leftIndex + 1, rightIndex).replace(/(?:\.\.\/){3}/g, "../../backstop_data");
    return "    {" + allTests.split(/}[\n\s]*,[\n\s]*{/).filter((test) => test.includes(`"status": "fail"`)).join(`},\n{`) + "}";
}

for (const browserType of ["chromium", "firefox", "webkit"]) {
    const pathForBrowser = `backstop_data/html_report/${browserType}`
    if (fs.existsSync(pathForBrowser)) {
        for (const dir of fs.readdirSync(pathForBrowser, { withFileTypes: true })) {
            if (dir.isDirectory()) {
                const pathForConfig = `${pathForBrowser}/${dir.name}/config.js`;

                if (fs.existsSync(pathForConfig)) {
                    const config = fs.readFileSync(pathForConfig, "utf8");
                    const tests = extractedTests(config);
                    combinedTests.push(tests)
                }
            }
        }
    }
}
