const mysql = require("mysql2/promise");

const environment = process.env.ENVIRONMENT || 'onpremise';
const DB_NAME = environment === 'aws'
    ? (process.env.AURORA_DATABASE || 'streaming')
    : (process.env.DB_DATABASE || 'streaming');
const TABLE_NAME = 'videos';

let pool;

// DB 초기화 Promise (앱 시작 시 한 번 실행됨)
const initPromise = (async () => {
    try {
        // 환경에 따른 DB 설정
        const dbConfig = environment === 'aws'
            ? {
                host: process.env.AURORA_HOST,
                user: process.env.AURORA_USER,
                password: process.env.AURORA_PASSWORD,
            }
            : {
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
            };

        console.log(`[DB] ${environment === 'aws' ? 'Aurora DB' : 'MySQL'} 연결 중...`);

        // DB 생성용 임시 커넥션 풀 (데이터베이스 지정 없음)
        const tempPool = mysql.createPool({
            connectionLimit: 1, // 최소한의 연결만 사용
            ...dbConfig,
        });

        // 데이터베이스 생성
        await tempPool.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
        await tempPool.end(); // 임시 커넥션 종료
        console.log(`[DB] 데이터베이스 '${DB_NAME}' 준비 완료.`);

        // 실제 사용할 커넥션 풀 생성 (데이터베이스 포함)
        pool = mysql.createPool({
            connectionLimit: 10,
            ...dbConfig,
            database: DB_NAME,
        });

        // 테이블 생성
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
                id INT PRIMARY KEY NOT NULL,          -- 인덱스
                title VARCHAR(255) NOT NULL,          -- 영상 제목
                description TEXT NOT NULL,            -- 영상 설명
                created_date DATE NOT NULL,           -- 업로드 날짜
                hls_path VARCHAR(512) NOT NULL,       -- 인코딩 영상 MinIO 경로
                thumbnail_path VARCHAR(512) NOT NULL  -- 썸네일 이미지 MinIO 경로
            );
        `);
        console.log(`[DB] 테이블 '${TABLE_NAME}' 준비 완료.`);

    } catch (err) {
        console.error("[DB] 초기화 실패:", err);
    }
})();

// query 모듈화
module.exports = {
    initPromise, // 외부에서 초기화 대기 가능하도록 export
    connection: async (query, values = []) => {
        // DB 초기화가 끝날 때까지 대기
        await initPromise;

        if (!pool) {
            throw new Error("데이터베이스 풀이 초기화되지 않았습니다.");
        }

        try {
            const [result] = await pool.query(query, values);
            if (Array.isArray(result) && result.length <= 1) return result[0];
            return result;
        } catch (err) {
            console.error("[DB] 쿼리 에러:", err);
            throw err;
        }
    },

    // DB 연결 풀 종료
    close: async () => {
        await initPromise;
        if (pool) {
            await pool.end();
        }
    }
};
