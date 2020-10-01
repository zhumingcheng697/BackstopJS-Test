const fs = require('fs');

const helper = require("./helper")
// const rl = helper.rl();
const logStyle = helper.logStyle;

const firefoxKey = "PUPPETEER_PRODUCT=firefox";
const installAllCmd = "npm install";
const installPuppeteerCmd = "npm install puppeteer";

/**
 * Current product of the installed puppeteer.
 *
 * @type {string}
 */
let currentPuppeteerProduct = helper.puppeteerProduct();

/**
 * Accesses package.json in backstopjs and takes a given action.
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
                let parsedPackageJson = JSON.parse(data);

                if (parsedPackageJson["dependencies"]) {
                    console.log(`${logStyle.fg.green}File "node_modules/backstopjs/package.json" parsed successfully${logStyle.reset}`);
                    action(parsedPackageJson);
                    return;
                } else {
                    console.error(`${logStyle.fg.red}Field "dependencies" not found${logStyle.reset}`)
                }
            } catch (e) {
                console.error(`${logStyle.fg.red}File "node_modules/backstopjs/package.json" cannot be parsed${logStyle.reset}`);
            }
        }

        process.exit(1);
    });
}

/**
 * Writes to package.json in backstopjs.
 *
 * @param {Object} packageJson Package to write to package.json
 * @param {function} handler Runs after write succeeded
 * @return {void}
 */
function writeToPackageJson(packageJson, handler = () => {}) {
    fs.writeFile("node_modules/backstopjs/package1.json", JSON.stringify(packageJson, null, 2), err => {
        if (err) {
            console.error(`${logStyle.fg.red}File "node_modules/backstopjs/package.json" cannot be saved: ${err}${logStyle.reset}`);
            process.exit(1);
        } else {
            console.log(`${logStyle.fg.green}File "node_modules/backstopjs/package.json" saved successfully${logStyle.reset}`);
            handler();
        }
    });
}

// accessPackageJson((packageJson) => {
//     packageJson["dependencies"]["puppeteer"] = "^5.3.0";
//     console.log(`${logStyle.fg.white}Setting "puppeteer" to "^5.3.0" in "dependencies"${logStyle.reset}`);
//     writeToPackageJson(packageJson);
// });

accessPackageJson((packageJson) => {
    delete packageJson["dependencies"]["puppeteer"];
    console.log(`${logStyle.fg.white}Removing "puppeteer" from "dependencies"${logStyle.reset}`);
    writeToPackageJson(packageJson);
});