const logRed = "\x1b[31m";
const logGreen = "\x1b[32m";
const logReset = "\x1b[0m";
const bucketName = process.argv[2] || "backstop-reports";

const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

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
            console.error(`${logRed}An error occurred when trying to create bucket "${bucketName}":\n${err}${logReset}`);
            // process.exit(1);
        } else {
            console.log(`${logGreen}Bucket "${bucketName}" created successfully${logReset}`);
            // upload files
        }
    })
}

s3.listBuckets((err, data) => {
    if (err) {
        console.error(`${logRed}An error occurred when trying to connect to AWS:\n${err}${logReset}`);
        // process.exit(1);
    } else {
        if (data.Buckets.find((bucket) => (bucket.Name === bucketName))) {
            console.log(`${logGreen}Bucket "${bucketName}" found on AWS${logReset}`);
            // upload files
        } else {
            console.error(`${logRed}Bucket "${bucketName}" does not exist${logReset}`);
            createBucket();
        }
    }
});
