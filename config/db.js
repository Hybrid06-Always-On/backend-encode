const mysql = require("mysql2/promise");

// 커넥션 풀 생성
const pool = mysql.createPool({
    connectionLimit: 10, 
    host : process.env.DB_HOST,
    user : process.env.DB_USER,
    password : process.env.DB_PASSWORD,
    database : process.env.DB_DATABASE
});


// query 모듈화
module.exports = {
    connection: async(query, values = []) => {
        try {
            const [result] = await pool.query(query, values);
            if (result.length <= 1) {
                return result[0];
            }
                return result;
        } catch(err) {
            return err;
        }
    }
}