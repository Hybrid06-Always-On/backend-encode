const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");

// S3 클라이언트 생성
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

// S3 모듈화
module.exports = {
    client: s3Client,
    buckets: {
        hls: process.env.S3_BUCKET_HLS,
        thumb: process.env.S3_BUCKET_THUMB
    },

    // 파일 업로드 래퍼
    upload: async (bucketType, objectName, filePath) => {
        try {
            const bucketName = bucketType === 'hls' ? process.env.S3_BUCKET_HLS : process.env.S3_BUCKET_THUMB;
            if (!bucketName) throw new Error('잘못된 버킷 타입입니다');

            const fileContent = fs.readFileSync(filePath);

            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: objectName,
                Body: fileContent,
            });

            await s3Client.send(command);
            return true;
        } catch (err) {
            return false;
        }
    }
};
