const fs = require("fs")
const str = fs.readFileSync("backstop_data/html_report/chromium/Alumni_Content/config.js", "utf8")

const leftIndex = str.indexOf("[");
const rightIndex = str.lastIndexOf("]");

const content = str.slice(leftIndex + 1, rightIndex).replace(/(?:\.\.\/){3}/g, "backstop_data");

console.log(
    JSON.parse("[" +
        [content, content].join(",")
    + "]")
)
