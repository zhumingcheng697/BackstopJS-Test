const fs = require("fs");
const readline = require("readline");

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
 * Reads the keyboard input from the console.
 *
 * @link http://logan.tw/posts/2015/12/12/read-lines-from-stdin-in-nodejs/
 */
function rl() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });
}

/**
 * Checks which version of Puppeteer has been installed.
 *
 * @param {boolean} log Whether to log the found Puppeteer version
 * @param {boolean} exit Whether to exit the process if no Puppeteer is found
 * @return {string}
 */
function puppeteerProduct(log = true, exit = true) {
    if (fs.existsSync("node_modules/puppeteer/.local-chromium")) {
        if (log) {
            console.log(`${logStyle.fg.green}Chrome version of Puppeteer found.${logStyle.reset}`);
        }

        return "Chrome";
    } else if (fs.existsSync("node_modules/puppeteer/.local-firefox")) {
        if (log) {
            console.log(`${logStyle.fg.green}Firefox version of Puppeteer found.${logStyle.reset}`);
        }

        return "Firefox";
    } else if (fs.existsSync("node_modules/puppeteer")) {
        if (log) {
            console.error(`${logStyle.fg.red}An unknown version of Puppeteer found.${logStyle.reset}`);
        }

        return "";
    } else {
        if (log) {
            console.error(`${logStyle.fg.red}Puppeteer not found.${logStyle.reset}`);
        }

        if (exit) {
            process.exit(1);
        }

        return "";
    }
}

module.exports.rl = rl;
module.exports.logStyle = logStyle;
module.exports.puppeteerProduct = puppeteerProduct;
