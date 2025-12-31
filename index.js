require('dotenv').config(); // .env 파일 환경변수 로드
const fs = require('fs');
const path = require('path');
const excel = require('./utils/excel');               // Excel 처리 유틸
const videoProcessor = require('./utils/videoProcessor'); // 영상 처리 유틸

// 디렉토리 경로 정의
const VIDEO_DIR = path.join(__dirname, 'video_data/video');  // 원본 영상
const IMAGE_DIR = path.join(__dirname, 'video_data/image');  // 원본 이미지
const TEMP_DIR = path.join(__dirname, 'temp_hls');           // 임시 HLS 저장
const EXCEL_PATH = path.join(__dirname, 'video_data/video_matadata.xlsx'); // Excel 경로

// TEMP_DIR 없으면 생성
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

/**
 * 메인 실행 함수
 * Excel 데이터를 읽고, 각 행마다 영상 처리 수행
 */
async function main() {
    const rows = excel.readExcel(EXCEL_PATH); // Excel 읽기
    for (const row of rows) {
        const id = row['인덱스']; // 영상 고유 ID
        if (!id) continue;       // ID 없으면 스킵

        try {
            // 영상 처리 (인코딩, MinIO 업로드, DB 저장)
            const result = await videoProcessor.processVideo(id, row, VIDEO_DIR, IMAGE_DIR, TEMP_DIR);
            if (result) {
                console.log(`[${id}] 인코딩 완료.`);
            }
        } catch (err) {
            // 처리 실패 시 로그
            console.error(`[${id}] 인코딩 실패:`, err.message);
        }
    }
}

// 메인 함수 실행
main();

