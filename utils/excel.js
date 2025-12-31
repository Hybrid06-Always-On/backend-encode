const xlsx = require('xlsx');

module.exports = {
    // Excel 파일을 읽어 JSON 배열로 변환
    readExcel: (filePath) => {
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        return xlsx.utils.sheet_to_json(sheet);
    },
    // Excel 날짜 시리얼 값을 JS Date 객체로 변환
    excelDateToJs: (serial) => {
        if (typeof serial === 'string') return new Date(serial);
        return new Date(Math.round((serial - 25569) * 86400 * 1000));
    }
};
