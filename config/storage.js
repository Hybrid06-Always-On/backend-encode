// 환경에 따라 MinIO 또는 S3를 사용하는 통합 모듈

const environment = process.env.ENVIRONMENT || 'onpremise';

let storageClient;

if (environment === 'aws') {
    // AWS 환경: S3 사용
    storageClient = require('./s3');
    console.log('[Storage] AWS S3를 사용합니다.');
} else {
    // 온프레미스 환경: MinIO 사용
    storageClient = require('./minio');
    console.log('[Storage] MinIO를 사용합니다.');
}

module.exports = storageClient;
