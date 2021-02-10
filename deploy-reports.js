const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

const { reportSourceFilePath, logStyle, resolveBrowserList, forEachFile } = require("./helper");

/**
 * Whether to render PDF for the report.
 *
 * @type {boolean}
 */
const overwriteReference = !!process.env.OVERWRITE_REFERENCE;

/**
 * Keeps track of how many files are being uploaded.
 *
 * @type {{chromium: number, firefox: number, webkit: number}}
 */
const uploadCounts = { chromium: 0, firefox: 0, webkit: 0 };

/**
 * Name of the bucket to deploy the files at.
 *
 * @type {string}
 */
let bucketName;

/**
 * Resolves the name of the S3 bucket.
 *
 * @return {string}
 */
function resolveBucketName() {
    /**
     * Generates and saves new S3 bucket name.
     *
     * @return {string}
     */
    function getNewBucketName() {
        console.log(`Generating new bucket name.`);

        const srcStr = "abcdefghijklmnopqrstuvwxyz0123456789";
        const newName = "backstop-reports-" + Array.from({ length: 12 }, () => srcStr[Math.floor(Math.random() * srcStr.length)]).join("");

        try {
            fs.writeFileSync("bucket-name.txt", newName);
            console.log(`${logStyle.fg.green}Using bucket named "${newName}".${logStyle.reset}`);
            return newName;
        } catch (e) {
            console.error(`${logStyle.fg.red}Unable to save generated bucket name to "bucket-name.txt":\n${e}${logStyle.reset}`);
            process.exit(1);
        }
    }

    console.log(`${logStyle.fg.white}------Connecting to S3 bucket------${logStyle.reset}`);

    try {
        const foundName = fs.readFileSync("bucket-name.txt", "utf8");
        if (foundName && foundName.length >= 3 && foundName.length <= 63 && !foundName.match(/^(?:[0-9]+\.)+[0-9]+$/) && foundName.match(/^(?:[a-z0-9]+[.-])*[a-z0-9]+$/) && foundName.toLowerCase() === foundName) {
            console.log(`${logStyle.fg.green}Using bucket named "${foundName}".${logStyle.reset}`);
            return foundName;
        } else {
            console.log(`${logStyle.fg.red}Bucket name "${foundName}" stored in "bucket-name.txt" is invalid.${logStyle.reset}`);
            return getNewBucketName();
        }
    } catch (e) {
        return getNewBucketName();
    }
}

/**
 * Makes sure bucket exists.
 *
 * @param callback {function}
 * @return {void}
 */
function checkBucketExistence(callback = () => {}) {
    /**
     * Creates a new S3 bucket.
     *
     * @param callback {function}
     * @see bucketName
     * @return {void}
     */
    function createBucket(callback = () => {}) {
        console.log(`Creating bucket "${bucketName}".`);
        s3.createBucket({ Bucket: bucketName, ACL: "public-read" }, (err) => {
            if (err) {
                console.error(`${logStyle.fg.red}An error occurred when trying to create bucket "${bucketName}":\n${err}${logStyle.reset}`);
                process.exit(1);
            } else {
                console.log(`${logStyle.fg.green}Bucket "${bucketName}" created successfully.${logStyle.reset}`);
                callback();
            }
        });
    }

    s3.headBucket({ Bucket: bucketName }, (err, data) => {
        if (data) {
            console.log(`${logStyle.fg.green}Bucket "${bucketName}" found on AWS.${logStyle.reset}`);
            callback();
        } else {
            console.error(`${logStyle.fg.red}Bucket "${bucketName}" does not exist.${logStyle.reset}`);
            createBucket(callback);
        }
    });
}

/**
 * @callback fileUploadCallback
 * @param exists {boolean}
 * @param err {Error}
 * @param data {ManagedUpload.SendData}
 * @return {void}
 */

/**
 * Uploads file to S3 Bucket with the key being its local path.
 *
 * @param filePath {string}
 * @param callback {fileUploadCallback}
 * @param overwrite {boolean}
 * @return {void}
 */
function uploadFile(filePath, callback = () => {}, overwrite = false) {
    /**
     * Helper function that actually uploads the file.
     *
     * @return {void}
     */
    function uploadHelper() {
        s3.upload({
            Bucket: bucketName,
            Key: filePath,
            Body: fs.createReadStream(filePath),
            ACL: "public-read",
            ContentType: filePath.endsWith(".html") ? "text/html" : undefined
        }, (err, data) => {
            if (err) {
                console.error(`${logStyle.fg.red}An error occurred when trying to upload file "${filePath}":\n${err}${logStyle.reset}`);
                callback(false, err, data);
            } else {
                callback(false, err, data);
            }
        });
    }

    if (overwrite) {
        uploadHelper();
        return;
    }

    s3.headObject({ Bucket: bucketName, Key: filePath }, (err, data) => {
        if (!data) {
            try {
                uploadHelper();
            } catch (e) {
                console.error(`${logStyle.fg.red}An error occurred when trying to upload file "${filePath}":\n${e}${logStyle.reset}`);
                callback(false, e, null);
            }
        } else {
            callback(true, null, null);
        }
    });
}

/**
 * Uploads files in the latest report folder.
 *
 * @param dir {string}
 * @param browserType {string}
 * @return {void}
 */
function uploadReportFolder(dir, browserType) {
    let localCount = 0;

    forEachFile(dir, (filePath) => {
        if (!filePath.endsWith("index.html")) {
            localCount += 1;
            setTimeout(() => {
                uploadFile(filePath, () => {
                    localCount -= 1;

                    if (!localCount) {
                        uploadFile(path.join(dir, "index.html"), (exists, err, data) => {
                            if (data && data.Location) {
                                console.log(`${logStyle.fg.green}Report for ${browserType} deployed successfully:${logStyle.reset}\n${data.Location}`);
                            } else {
                                console.error(`${logStyle.fg.red}Report deploy failed for ${browserType}.${logStyle.reset}`);
                            }
                        }, true);
                    }
                });
            }, 50);
        }
    });
}

/**
 * Locates the latest local reports.
 *
 * @param browserList {string[]}
 * @return {void}
 */
function locateLatestReport(browserList) {
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

    console.log(`${logStyle.fg.white}------Locating latest report------${logStyle.reset}`);

    for (const browserType of browserList) {
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
                            const matchStr = config.match(/^report\({\s*"testSuite": "([a-zA-Z]+)",\s*"id": "Combined at ((?:[^"]|\\")+(?:[^"\\]|\\"))"/);

                            if (matchStr && matchStr.length === 3 && matchStr[1].toLowerCase() === browserType && !isNaN((new Date(JSON.parse(`"` + matchStr[2] + `"`))).getTime())) {
                                console.log(`${logStyle.fg.green}Found report combined at ${JSON.parse(`"` + matchStr[2] + `"`)} for ${browserType}.${logStyle.reset}`);
                            } else {
                                console.warn(`${logStyle.fg.red}The latest combined report for ${browserType} might be in an incorrect format.${logStyle.reset}`);
                            }

                            (config.match(/[^\\]": "(?:\.\.\/)+(?:[^"]|\\")*(?:[^"\\]|\\")"/gi) || []).forEach((dir) => {
                                const dependency = path.join(latestPath, JSON.parse(dir.slice(dir.indexOf(`"../`))));
                                uploadCounts[browserType] += 1;
                                setTimeout(() => {
                                    uploadFile(dependency, () => {
                                        uploadCounts[browserType] -= 1;

                                        if (!uploadCounts[browserType]) {
                                            uploadReportFolder(latestPath, browserType);
                                        }
                                    }, overwriteReference && dependency.includes(`/bitmaps_reference/${browserType}/`));
                                }, 50);
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

    if (Object.keys(uploadCounts).some((el) => uploadCounts[el])) {
        console.log(`${logStyle.fg.white}------Deploying latest report------${logStyle.reset}`);
    }
}

/**
 * Self-invoking main function.
 *
 * @return {void}
 */
(function main() {
    const browserList = resolveBrowserList(process.argv.slice(2));

    if (browserList.length) {
        bucketName = resolveBucketName();
        checkBucketExistence(() => {
            locateLatestReport(browserList);
        });
    }
})();
