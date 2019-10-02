const AWS = require('aws-sdk')
const path = require('path')

// Set credentials and region,
// which can also go directly on the service client

let isAwsEnabled = process.env.AWS_REGION && process.env.AWS_BUCKET

let awsConfig = false

if (isAwsEnabled) {
    if (process.env.AWS_COGNITO_POOL) {
        awsConfig = {region: process.env.AWS_REGION, credentials: new AWS.CognitoIdentityCredentials({
            IdentityPoolId: process.env.AWS_COGNITO_POOL
        })}
        AWS.config.update(awsConfig);
    }
}

let uploadFile = false
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
uploadFile = (fileName, file, successCallback, failCallback) => {
    const Key = process.env.AWS_FOLDER ? `${path.normalize(process.env.AWS_FOLDER)}/${fileName}` : fileName
    s3.upload({
        Key,
        Body: file,
        Bucket: process.env.AWS_BUCKET,
        ACL: 'public-read'
        }, function(err, data) {
        if (err) {
            failCallback(err.message)
        } else {
            successCallback()
        }
    });
}


module.exports = uploadFile 