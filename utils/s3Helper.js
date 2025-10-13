const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure S3
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'eu-west-3'
  // Remove explicit credentials to use IAM role
});

const BUCKET_NAME = 'smarttalent-videos-eu-west-3';

// Upload file to S3
const uploadToS3 = async (filePath, key) => {
  try {
    const fileContent = fs.readFileSync(filePath);
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: 'video/mp4'
      // Removed ACL as bucket doesn't allow ACLs
    };
    
    const result = await s3.upload(params).promise();
    console.log(`File uploaded to S3: ${result.Location}`);
    return result.Location;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
};

// Delete file from S3
const deleteFromS3 = async (key) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };
    
    await s3.deleteObject(params).promise();
    console.log(`File deleted from S3: ${key}`);
  } catch (error) {
    console.error('S3 delete error:', error);
    throw error;
  }
};

// Generate S3 key
const generateS3Key = (originalName, userId) => {
  const timestamp = Date.now();
  const extension = path.extname(originalName);
  return `videos/${userId}/${timestamp}${extension}`;
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  generateS3Key
};
