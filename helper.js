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
 * Available browser types.
 *
 * @type {Object.<string, string>}
 */
const BrowserName = {
    chromium: "Chromium",
    firefox: "Firefox",
    webkit: "WebKit"
};

/**
 * Resolves one or no browser type.
 *
 * @param line {string}
 * @return {string|null}
 */
function resolveBrowserType(line) {
    if (BrowserName[line.toLowerCase()]) {
        return BrowserName[line.toLowerCase()].toLowerCase();
    } else if (line.toLowerCase() === "c") {
        return BrowserName.chromium.toLowerCase();
    } else if (line.toLowerCase() === "f") {
        return BrowserName.firefox.toLowerCase();
    } else if (line.toLowerCase() === "w") {
        return BrowserName.webkit.toLowerCase();
    } else {
        return null;
    }
}

/**
 * Resolves a list of browser type.
 *
 * @param args {string[]}
 * @return {string[]}
 */
function resolveBrowserList(args) {
    const result = args.reduce((prev, curr) => {
        const name = resolveBrowserType(curr);
        if (name) {
            prev.push(name);
        }
        return prev;
    }, []);

    if (!result.length) {
        return Object.keys(BrowserName);
    } else {
        return result;
    }
}

/**
 * Callback for forEachFile
 *
 * @callback fileCallback
 * @param path {string}
 * @see forEachFile
 * @return {void}
 */

/**
 * Iterates through files in a directory.
 *
 * @param dir {string}
 * @param callback {fileCallback}
 * @param recursive {boolean}
 * @return {void}
 */
function forEachFile(dir, callback, recursive = true) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
        return;
    }

    for (const subDir of fs.readdirSync(dir, { withFileTypes: true })) {
        const newDir = `${dir}/${subDir.name}`;

        if (subDir.isDirectory()) {
            if (recursive) {
                forEachFile(newDir, callback, true);
            }
        } else {
            callback(newDir);
        }
    }
}

module.exports = { logStyle, BrowserName, resolveBrowserType, resolveBrowserList, forEachFile };
