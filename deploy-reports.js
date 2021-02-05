const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

const { logStyle } = require("./helper");

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
    s3.createBucket( { Bucket: bucketName, ACL: "public-read" }, (err) => {
        if (err) {
            console.error(`${logStyle.fg.red}An error occurred when trying to create bucket "${bucketName}":\n${err}${logStyle.reset}`);
            // process.exit(1);
        } else {
            console.log(`${logStyle.fg.green}Bucket "${bucketName}" created successfully${logStyle.reset}`);
            // upload files
        }
    })
}

s3.listBuckets((err, data) => {
    if (err) {
        console.error(`${logStyle.fg.red}An error occurred when trying to connect to AWS:\n${err}${logStyle.reset}`);
        // process.exit(1);
    } else {
        if (data.Buckets.find((bucket) => (bucket.Name === bucketName))) {
            console.log(`${logStyle.fg.green}Bucket "${bucketName}" found on AWS${logStyle.reset}`);
            // upload files
        } else {
            console.error(`${logStyle.fg.red}Bucket "${bucketName}" does not exist${logStyle.reset}`);
            createBucket();
        }
    }
});
