const fs = require('fs');

const helper = require("./helper")
const rl = helper.rl();
const logStyle = helper.logStyle;

const firefoxKey = "PUPPETEER_PRODUCT=firefox";
const installAllCmd = "npm install";
const installPuppeteerCmd = "npm install puppeteer";

/**
 * Current product of the installed puppeteer
 *
 * @type {string}
 */
let currentPuppeteerProduct = helper.puppeteerProduct();