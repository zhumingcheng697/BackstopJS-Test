const AWS = require("aws-sdk");
AWS.config.update({region: "us-east-1"});

const s3 = new AWS.S3({apiVersion: "2006-03-01"});
s3.listBuckets((err, data) => {
    if (err) {
        console.log("Error", require("util").inspect(err, false, null));
    } else {
        console.log("Success", data.Buckets);
        console.log("Success", require("util").inspect(data.Buckets, false, null));
    }
});
