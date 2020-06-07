const AWS = require('aws-sdk');

const s3SigV4Client = new AWS.S3({
    signatureVersion: 'v4'
});

module.exports = {
    getS3PreSignedUrl: function getS3PreSignedUrl(s3ObjectKey) {
        const bucketName = process.env.S3_PERSISTENCE_BUCKET;
        const s3PreSignedUrl = s3SigV4Client.getSignedUrl('getObject', {
            Bucket: bucketName,
            Key: s3ObjectKey,
            Expires: 60*1 // the Expires is capped for 1 minute
        });
        console.log(`Util.s3PreSignedUrl: ${s3ObjectKey} URL ${s3PreSignedUrl}`);
        return s3PreSignedUrl;
    },
    getPersistenceAdapter: function getPersistenceAdapter(tableName) {
        // This function is an indirect way to detect if this is part of an Alexa-Hosted skill
        function isAlexaHosted() {
            return process.env.S3_PERSISTENCE_BUCKET;
        }
        if (isAlexaHosted()) {
            const {S3PersistenceAdapter} = require('ask-sdk-s3-persistence-adapter');
            return new S3PersistenceAdapter({
                bucketName: process.env.S3_PERSISTENCE_BUCKET
            });
        } else {
            throw new Error("DynamoDB is not supported at the moment. If you are a user, contact a developer. If you are a developer, go to your code and uncomment the DynamoDB related code.");

            // If not using an Alexa hosted skill, you need an AWS account
            // In that case, add the dependency from the 'require' function
            // and uncomment the code below

            // IMPORTANT: don't forget to give DynamoDB access to the role you're using to run this lambda (via IAM policy)
            // const {DynamoDbPersistenceAdapter} = require('ask-sdk-dynamodb-persistence-adapter');
            // return new DynamoDbPersistenceAdapter(
            //     {
            //         tableName: tableName,
            //         createTable: true
            //     }
            // );
        }
    }

}