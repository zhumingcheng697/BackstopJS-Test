const fs = require("fs");

/**
 * Extracts tests from config
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

for (const browserType of ["chromium", "firefox", "webkit"]) {
    const pathForBrowser = `backstop_data/html_report/${browserType}`
    const testsForBrowser = []

    if (fs.existsSync(pathForBrowser)) {
        for (const dir of fs.readdirSync(pathForBrowser, { withFileTypes: true })) {
            if (dir.isDirectory()) {
                const pathForConfig = `${pathForBrowser}/${dir.name}/config.js`;

                if (fs.existsSync(pathForConfig)) {
                    const config = fs.readFileSync(pathForConfig, "utf8");
                    const tests = extractedTests(config);
                    testsForBrowser.push(tests)
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

    const allTests = testsForBrowser.join(",")
    const outputConfig = `report({
  "testSuite": "BackstopJS",
  "tests": [` + allTests + `]
});`;
    fs.writeFileSync(`${outputPath}/config.js`, outputConfig);
}
