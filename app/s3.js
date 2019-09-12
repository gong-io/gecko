import AWS from 'aws-sdk'

// Set credentials and region,
// which can also go directly on the service client

let isAwsEnabled = process.env.AWS_REGION && process.env.AWS_BUCKET

let awsConfig = false

if (isAwsEnabled) {
    if (process.env.AWS_COGNITO_POOL) {
        awsConfig = {region: process.env.AWS_REGION, credentials: new AWS.CognitoIdentityCredentials({
            IdentityPoolId: process.env.AWS_COGNITO_POOL
        })}
    } else if (process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_KEY) {
        awsConfig = {
            region: process.env.AWS_REGION, 
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET_KEY
        }
    }
}

let uploadFile = false
if (awsConfig) {
    AWS.config.update(awsConfig);
    const s3 = new AWS.S3({apiVersion: '2006-03-01'});
    uploadFile = (fileName, file) => {
        const Key = process.env.AWS_FOLDER ? `${process.env.AWS_FOLDER}//${fileName}` : fileName
        s3.upload({
          Key,
          Body: file,
          Bucket: process.env.AWS_BUCKET,
          ACL: 'public-read'
        }, function(err, data) {
          if (err) {
            return alert('There was an error uploading your file: ', err.message);
          }
          alert('Successfully uploaded file.');
        });
    }
}


export default uploadFile 