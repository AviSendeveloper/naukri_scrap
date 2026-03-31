const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand
} = require("@aws-sdk/client-s3");
const fs = require('fs');
const path = require('path');
const TEMP_FILE_PATH = path.join(__dirname, '..', '..', 'temp');
if (!fs.existsSync(TEMP_FILE_PATH)) {
    fs.mkdirSync(TEMP_FILE_PATH, { recursive: true });
}

class S3Bucket {
    constructor() {
        this.s3Client = new S3Client({
            region: process.env.S3_BUCKET_REGION,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY,
                secretAccessKey: process.env.S3_SECRET_KEY
            }
        })
    }

    async uploadFile(filename, fileBuffer, contentType) {
        const putCommand = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: filename,
            Body: fileBuffer,
            ContentType: contentType,
        });

        await this.s3Client.send(putCommand);
    }

    async getFile(filename) {
        const getCommand = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: filename,
        });

        const s3GetResponse = await this.s3Client.send(getCommand);
        const data = await s3GetResponse.Body.transformToByteArray();
        return Buffer.from(data);
    }

    async checkFileExists(filename) {
        const checkCommand = new HeadObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: filename,
        });

        try {
            await this.s3Client.send(checkCommand);
            return true;
        } catch (error) {
            if (error.name === 'NotFound') {
                return false;
            }
            throw error;
        }
    }

    async createTempFile(uniqueFileName) {
        const tempFileName = `${TEMP_FILE_PATH}/${uniqueFileName}`;
        const writeStream = fs.createWriteStream(tempFileName);

        const getComand = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: uniqueFileName,
        });

        const s3GetResponse = await this.s3Client.send(getComand);
        s3GetResponse.Body.pipe(writeStream);
        return tempFileName;
    }

    async deleteTempFile(uniqueFileName) {
        const tempFileName = `${TEMP_FILE_PATH}/${uniqueFileName}`;
        if (fs.existsSync(tempFileName)) {
            await fs.promises.unlink(tempFileName);
        }
        return true;
    }

    async deleteFile(uniqueFileName) {
        const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: uniqueFileName,
        });

        await this.s3Client.send(deleteCommand);
        return true;
    }
}

module.exports = S3Bucket;