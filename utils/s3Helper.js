const AWS = require('aws-sdk');
const fs = require('fs');

const s3 = new AWS.S3({
  region: 'eu-west-3'
});

const BUCKET_NAME = 'smarttalent-videos-eu-west-3';

const uploadToS3 = async (filePath, key) => {
  const fileContent = fs.readFileSync(filePath);
  
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: 'video/mp4',
    ACL: 'public-read'
  };
  
  const result = await s3.upload(params).promise();
  return result.Location;
};

module.exports = { uploadToS3 };
