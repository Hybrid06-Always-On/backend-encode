const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);  // ffmpeg 경로 설정

const db = require('../config/db');      // DB 연결 모듈
const minio = require('../config/minio'); // MinIO 업로드 모듈

module.exports = {
    /**
     * 영상 인코딩, MinIO 업로드, DB 저장을 처리하는 함수
     * @param {number|string} id - 영상 인덱스
     * @param {object} row - Excel 행 데이터
     * @param {string} VIDEO_DIR - 원본 영상 디렉토리
     * @param {string} IMAGE_DIR - 원본 이미지 디렉토리
     * @param {string} TEMP_DIR - 임시 HLS 저장 디렉토리
     * @returns {boolean} 성공 여부
     */
    processVideo: async (id, row, VIDEO_DIR, IMAGE_DIR, TEMP_DIR) => {
        // 1. DB에 이미 존재하는지 확인
        const existing = await db.connection('SELECT id FROM videos WHERE id = ?', [id]);
        if (existing && existing.id) {
            console.log(`[video${id}] 이미 DB에 존재합니다.`);
            return false;
        }

        // 2. Excel에서 데이터 가져오기
        let videoFileName = row['원본 영상 파일 이름'];
        let imageFileName = row['원본 이미지 파일 이름'];
        const title = row['영상 제목'];
        const description = row['영상 설명'];
        const dateRaw = row['날짜'];

        // 3. 필수 데이터 체크
        if (!title) {
            console.error(`[${id}] 제목이 누락되었습니다. DB에 저장할 수 없습니다.`);
            return false;
        }
        if (!videoFileName && !imageFileName) {
            console.error(`[${id}] 엑셀에 파일명이 누락되었습니다.`);
            return false;
        }

        // 4. 확장자 누락 처리
        if (videoFileName && !path.extname(videoFileName)) {
            if (fs.existsSync(path.join(VIDEO_DIR, videoFileName + '.mp4'))) videoFileName += '.mp4';
        }
        if (imageFileName && !path.extname(imageFileName)) {
            if (fs.existsSync(path.join(IMAGE_DIR, imageFileName + '.jpg'))) imageFileName += '.jpg';
        }

        // 5. 이미지 파일명이 없으면 ID로 추론
        if (!imageFileName) {
            const candidate = `image${id}.jpg`;
            if (fs.existsSync(path.join(IMAGE_DIR, candidate))) imageFileName = candidate;
        }

        const sourceVideoPath = path.join(VIDEO_DIR, videoFileName); // 원본 영상 경로
        const sourceImagePath = path.join(IMAGE_DIR, imageFileName); // 원본 이미지 경로

        // 6. 원본 파일 존재 여부 확인
        if (!fs.existsSync(sourceVideoPath)) {
            console.error(`[${id}] 원본 영상을 찾을 수 없습니다: ${sourceVideoPath}`);
            return false;
        }
        if (!fs.existsSync(sourceImagePath)) {
            console.error(`[${id}] 썸네일 이미지를 찾을 수 없습니다: ${sourceImagePath}`);
            return false;
        }

        // 7. 임시 출력 디렉토리 생성
        const outDir = path.join(TEMP_DIR, String(id));
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        const m3u8Path = path.join(outDir, 'index.m3u8'); // HLS 출력 경로

        // 8. FFmpeg로 HLS 인코딩
        console.log(`[${id}] 인코딩 중...`);
        await new Promise((resolve, reject) => {
            ffmpeg(sourceVideoPath)
                .outputOptions([
                    '-profile:v baseline', '-level 3.0', '-start_number 0',
                    '-hls_time 10', '-hls_list_size 0', '-f hls'
                ])
                .output(m3u8Path)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        // 9. HLS 파일 MinIO 업로드
        const files = fs.readdirSync(outDir);
        const hlsObjectPrefix = `video_${id}`;
        for (const file of files) {
            await minio.upload('hls', `${hlsObjectPrefix}/${file}`, path.join(outDir, file));
        }

        // 10. 썸네일 업로드
        await minio.upload('thumb', `video_${id}${path.extname(imageFileName)}`, sourceImagePath);

        // 11. DB 저장
        const createdDate = require('./excel').excelDateToJs(dateRaw);
        await db.connection(
            `INSERT INTO videos (id, title, description, created_date, hls_path, thumbnail_path) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                id,
                title,
                description,
                createdDate,
                `${hlsObjectPrefix}/index.m3u8`,
                `video_${id}${path.extname(imageFileName)}`
            ]
        );

        // 12. 임시 디렉토리 삭제
        fs.rmSync(outDir, { recursive: true, force: true });

        return true; // 처리 성공
    }
};
