const fs = require("fs");


/**
 * Makes the console logs colorful.
 *
 * @link https://stackoverflow.com/a/40560590
 * @type {Object}
 */
const logStyle = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",
    fg: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
        crimson: "\x1b[38m"
    },
    bg: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m",
        crimson: "\x1b[48m"
    }
};

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
                console.error(`${logStyle.fg.red}Failed to copy files from ${srcDir} to ${destDir}:\n${e}${logStyle.reset}`);
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
                console.error(`${logStyle.fg.red}Failed to write ${browserType} test files to ${outputPath}:\n${e}${logStyle.reset}`);
            }

            const fileSource = "node_modules/backstop-playwright/compare/output";
            if (fs.existsSync(fileSource)) {
                try {
                    copyNewFiles(fileSource, outputPath);
                } catch (e) {
                    console.error(`${logStyle.fg.red}An error occurred when copying source files:\n${e}${logStyle.reset}`);
                }
            } else {
                console.error(`${logStyle.fg.red}Source files missing from "node_modules/backstop-playwright/compare/output"${logStyle.reset}`);
            }
        } catch (e) {
            console.error(`${logStyle.fg.red}An error occurred when accessing ${browserType} test files:\n${e}${logStyle.reset}`);
        }
    }
}

combineReports();
