const os = require("os");
const fs = require("fs");
const path = require("path");

/**
 * Path of the report source files in node_modules
 *
 * @type {string}
 */
const reportSourceFilePath = `node_modules/backstop-playwright/compare/output`;

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
 * @param filePath {string}
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
        const newDir = path.join(dir, subDir.name);

        if (subDir.isDirectory()) {
            if (recursive) {
                forEachFile(newDir, callback, true);
            }
        } else {
            callback(newDir);
        }
    }
}

/**
 * Overrides the system setup to fix WebKit for Ubuntu 20 and newer.
 *
 * @return {void}
 */
function fixWebkitForUbuntu() {
    try {
        if (os.platform() === "linux") {
            if (fs.existsSync("/etc/os-release")) {
                const osRelease = fs.readFileSync("/etc/os-release", "utf8");
                const osName = osRelease.match(/\bNAME=([^\n]+)/i)[1];
                if (osName && osName.toLowerCase().includes("ubuntu")) {
                    const osVersion = osRelease.match(/\bVERSION="?([0-9]+(?:\.[0-9]+)*)/i)[1];
                    if (osVersion && osVersion.split(".").map(Number)[0] >= 20) {
                        if (!fs.existsSync("/etc/gnutls")) {
                            fs.mkdirSync("/etc/gnutls");
                        }

                        const configStr = "[overrides]\ndefault-priority-string = NORMAL:-VERS-ALL:+VERS-TLS1.3:+VERS-TLS1.2:+VERS-DTLS1.2:%PROFILE_LOW";

                        if (!fs.existsSync("/etc/gnutls/config") || !fs.readFileSync("/etc/gnutls/config", "utf8").includes(configStr)) {
                            fs.appendFileSync("/etc/gnutls/config", configStr);
                            console.log(`${logStyle.fg.green}Fix applied successfully for WebKit on Ubuntu ${osVersion}${logStyle.reset}`);
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error(`${logStyle.fg.red}Failed to apply fix for WebKit on Ubuntu 20 and newer${logStyle.reset}`);
    }
}

module.exports = { reportSourceFilePath, logStyle, BrowserName, resolveBrowserType, resolveBrowserList, forEachFile, fixWebkitForUbuntu };
