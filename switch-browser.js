const fs = require('fs');
const { exec } = require('child_process');

const helper = require("./helper");
const rl = helper.rl();
const logStyle = helper.logStyle;

const debugMode = false;
const firefoxKey = "PUPPETEER_PRODUCT=firefox";
const installCmd = "npm install";

/**
 * Current product of the installed puppeteer.
 *
 * @type {string}
 */
let currentProduct = helper.puppeteerProduct(true, false);

/**
 * Swaps the Puppeteer product version.
 *
 * @return {void}
 */
function swapPuppeteer() {
    /**
     * Accesses "package.json" in backstopjs and takes a given action.
     *
     * @param {function} action The action to take should package.json be found and parsed
     * @return {void}
     */
    function accessPackageJson(action) {
        fs.readFile("node_modules/backstopjs/package.json", "utf-8", (err, data) => {
            if (err) {
                console.error(`${logStyle.fg.red}File "node_modules/backstopjs/package.json" not found${logStyle.reset}`);
            } else {
                try {
                    const parsedPackageJson = JSON.parse(data);

                    if (parsedPackageJson["dependencies"]) {
                        if (debugMode) {
                            console.log(`${logStyle.fg.green}File "node_modules/backstopjs/package.json" parsed successfully${logStyle.reset}`);
                        }

                        action(parsedPackageJson);
                        return;
                    } else {
                        console.error(`${logStyle.fg.red}Field "dependencies" not found${logStyle.reset}`);
                    }
                } catch (e) {
                    console.error(`${logStyle.fg.red}File "node_modules/backstopjs/package.json" cannot be parsed${logStyle.reset}`);
                }
            }

            process.exit(1);
        });
    }

    /**
     * Writes to "package.json" in backstopjs.
     *
     * @param {Object} packageJson Package to write to package.json
     * @param {function} handler Runs after write succeeded
     * @return {void}
     */
    function writeToPackageJson(packageJson, handler = () => {}) {
        fs.writeFile("node_modules/backstopjs/package.json", JSON.stringify(packageJson, null, 2), err => {
            if (err) {
                console.error(`${logStyle.fg.red}File "node_modules/backstopjs/package.json" cannot be saved: ${err}${logStyle.reset}`);
                process.exit(1);
            } else {
                if (debugMode) {
                    console.log(`${logStyle.fg.green}File "node_modules/backstopjs/package.json" saved successfully${logStyle.reset}`);
                }

                handler();
            }
        });
    }

    /**
     * Runs a terminal shell command.
     *
     * @param {string} cmd Command to run
     * @param {function} handler Runs after write succeeded
     * @return {void}
     */
    function execute(cmd, handler = () => {}) {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`${logStyle.fg.red}${error}${logStyle.reset}`);
                process.exit(1);
            }

            if (debugMode) {
                if (stdout) {
                    console.log(stdout);
                }

                if (stderr) {
                    console.warn(stderr);
                }
            }

            handler();
        });
    }

    /**
     * Uninstalls Puppeteer by removing it from "package.json" and calling "npm install".
     *
     * @param {function} handler Runs after write succeeded
     * @return {void}
     */
    function uninstallPuppeteer(handler = () => {}) {
        accessPackageJson((packageJson) => {
            delete packageJson["dependencies"]["puppeteer"];
            if (debugMode) {
                console.log(`${logStyle.fg.white}Removing "puppeteer" from "dependencies"${logStyle.reset}`);
            }

            writeToPackageJson(packageJson, () => {
                process.stdout.write(`${logStyle.reverse}Uninstalling "puppeteer" and its dependencies`);

                const intervalId = setInterval(() => {
                    process.stdout.write(".");
                }, 1000);

                execute(`${installCmd}`, () => {
                    clearInterval(intervalId);
                    process.stdout.write(`${logStyle.reset}\n`);
                    console.log(`${logStyle.fg.green}${currentProduct ? `${currentProduct} version of ` : ""}Puppeteer uninstalled successfully${logStyle.reset}`);
                    handler();
                });
            });
        });
    }

    /**
     * Installs Puppeteer by adding it back to "package.json" and calling "npm install".
     *
     * @param {function} handler Runs after write succeeded
     * @return {void}
     */
    function reinstallPuppeteer(handler = () => {}) {
        accessPackageJson((packageJson) => {
            packageJson["dependencies"]["puppeteer"] = "^3.0.0";
            if (debugMode) {
                console.log(`${logStyle.fg.white}Setting "puppeteer" to "^3.0.0" in "dependencies"${logStyle.reset}`);
            }

            writeToPackageJson(packageJson, () => {
                process.stdout.write(`${logStyle.reverse}Reinstalling "puppeteer" and its dependencies`);

                const intervalId = setInterval(() => {
                    process.stdout.write(".");
                }, 1000);

                execute(currentProduct === "Chrome" ? `${firefoxKey} ${installCmd}` : `${installCmd}`, () => {
                    currentProduct = helper.puppeteerProduct(false);
                    clearInterval(intervalId);
                    process.stdout.write(`${logStyle.reset}\n`);
                    console.log(`${logStyle.fg.green}${currentProduct ? `${currentProduct} version of ` : ""}Puppeteer reinstalled successfully${logStyle.reset}`);
                    handler();
                });
            });
        });
    }

    uninstallPuppeteer(() => {
        reinstallPuppeteer(() => {
            process.exit(0);
        });
    });
}

/**
 * Self-invoking main function.
 *
 * @return {void}
 */
(function main() {
    console.log(`${logStyle.fg.white}Switch to ${currentProduct === "Chrome" ? "Firefox" : "Chrome"} version?${logStyle.reset} (y/n)`);

    rl.on('line', (line) => {
        if (line.toUpperCase() === "Y") {
            swapPuppeteer();
            rl.close();
        } else if (line.toUpperCase() === "N") {
            process.exit(0);
        } else {
            console.error(`${logStyle.fg.red}Please type in a valid keyword. (y/n)${logStyle.reset}`);
        }
    });
})();
