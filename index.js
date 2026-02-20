require('dotenv').config(); // .env 파일 환경변수 로드
const fs = require('fs');
const path = require('path');
const excel = require('./utils/excel');               // Excel 처리 유틸
const videoProcessor = require('./utils/videoProcessor'); // 영상 처리 유틸
const db = require('./config/db'); // DB 설정

// 디렉토리 경로 정의 (NFS 마운트 경로: /video_data)
const VIDEO_DIR = '/video_data/video';
const IMAGE_DIR = '/video_data/image';
const EXCEL_PATH = '/video_data/video_matadata.xlsx';
const TEMP_DIR = process.env.TEMP_DIR || path.join(__dirname, 'temp_hls'); // 임시 HLS 저장

// TEMP_DIR 없으면 생성
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

/**
 * 메인 실행 함수
 * Excel 데이터를 읽고, 각 행마다 영상 처리 수행
 */
async function main() {
    await db.initPromise; // DB 초기화 대기
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

    // DB 연결 풀 종료 (프로세스가 종료되도록)
    await db.close();
    console.log('모든 작업이 완료되었습니다.');
}

// 메인 함수 실행
main();
