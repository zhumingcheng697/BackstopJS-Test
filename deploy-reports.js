const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

const { reportSourceFilePath, logStyle, resolveBrowserList, forEachFile } = require("./helper");

/**
 * Name of the bucket to deploy the files at
 *
 * @type {string}
 */
const bucketName = process.env.BUCKET_NAME || "backstop-reports";

/**
 * Creates a new S3 bucket.
 *
 * @see bucketName
 * @return {void}
 */
function createBucket() {
    console.log(`Creating bucket "${bucketName}"`);
    s3.createBucket({ Bucket: bucketName, ACL: "public-read" }, (err) => {
        if (err) {
            console.error(`${logStyle.fg.red}An error occurred when trying to create bucket "${bucketName}":\n${err}${logStyle.reset}`);
            // process.exit(1);
        } else {
            console.log(`${logStyle.fg.green}Bucket "${bucketName}" created successfully.${logStyle.reset}`);
            // upload files
        }
    });
}

function main() {
    s3.listBuckets((err, data) => {
        if (err) {
            console.error(`${logStyle.fg.red}An error occurred when trying to connect to AWS:\n${err}${logStyle.reset}`);
            // process.exit(1);
        } else {
            if (data.Buckets.find((bucket) => (bucket.Name === bucketName))) {
                console.log(`${logStyle.fg.green}Bucket "${bucketName}" found on AWS.${logStyle.reset}`);
                // upload files
            } else {
                console.error(`${logStyle.fg.red}Bucket "${bucketName}" does not exist.${logStyle.reset}`);
                createBucket();
            }
        }
    });
}

/**
 * Checks if the report folder contains all necessary files in reportSourceFilePath.
 *
 * @param dir {string}
 * @see reportSourceFilePath
 * @return {boolean}
 */
function checkReportValidity(dir) {
    let validity = true;

    forEachFile(reportSourceFilePath, (srcDir) => {
        if (!fs.existsSync(srcDir.replace(reportSourceFilePath, dir))) {
            validity = false;
        }
    });

    return validity;
}

for (const browserType of resolveBrowserList(process.argv.slice(2))) {
    const reportPath = `combined_report/${browserType}`;
    if (fs.existsSync(reportPath)) {
        const latestFolder = fs.readdirSync(reportPath, { withFileTypes: true }).filter((dir) => {
            if (dir.isDirectory()) {
                const createDate = new Date(dir.name.replace(/(T\d{2})-(\d{2})-(\d{2})-(\d{3}Z)$/, `$1:$2:$3.$4`));
                return !isNaN(createDate.getTime());
            } else {
                return false;
            }
        }).sort((a, b) => {
            if (a.name > b.name) {
                return -1;
            } else if (a.name < b.name) {
                return 1;
            } else {
                return 0;
            }
        })[0];

        if (latestFolder && latestFolder.name) {
            const latestPath = `${reportPath}/${latestFolder.name}`;

            if (checkReportValidity(latestPath)) {
                if (fs.existsSync(`${latestPath}/config.js`)) {
                    try {
                        const config = fs.readFileSync(`${latestPath}/config.js`, "utf8");
                        const matchStr = config.match(/^report\({\s*"testSuite":\s*"([a-zA-Z]+)",\s*"id":\s*"Combined at ((?:[^"]|\\")+(?:[^"\\]|\\"))"/);

                        if (matchStr && matchStr.length === 3 && matchStr[1].toLowerCase() === browserType && !isNaN((new Date(matchStr[2])).getTime())) {
                            console.log(`${logStyle.fg.green}Found report combined at ${matchStr[2]} for ${browserType}.${logStyle.reset}`);
                        } else {
                            console.warn(`${logStyle.fg.red}The latest combined report for ${browserType} might be in an incorrect format.${logStyle.reset}`);
                        }

                        const dependencies = config.match(/[^\\]": "(?:\.\.\/)+(?:[^"]|\\")*(?:[^"\\]|\\")"/gi) || [];
                        dependencies.forEach((dir, index) => {
                            dependencies[index] = dir.slice(dir.indexOf(`../`), -1).replace(/\\"/g, `"`).replace(/\\\\/g, "\\");
                            const testPath = latestPath + "/" + dependencies[index];
                            if (!fs.existsSync(testPath)) {
                                console.log(path.join(testPath));
                            }
                        });
                    } catch (e) {
                        console.error(`${logStyle.fg.red}Failed to load the latest combined report for ${browserType}:\n${e}${logStyle.reset}`);
                    }
                } else {
                    console.error(`${logStyle.fg.red}The latest combined report for ${browserType} is missing "config.js". Please run "npm run combine ${browserType.slice(0, 1)}" again.${logStyle.reset}`);
                }
            } else {
                console.error(`${logStyle.fg.red}The latest combined report for ${browserType} is missing some supporting files. Please run "npm run combine ${browserType.slice(0, 1)}" again.${logStyle.reset}`);
            }

            continue;
        }
    }

    console.error(`${logStyle.fg.red}No combined report found for ${browserType}. Please run "npm run combine ${browserType.slice(0, 1)}" first.${logStyle.reset}`);
}
