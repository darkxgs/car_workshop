const XLSX = require('xlsx');

const filePath = './Book1.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`\n--- Sheet: ${sheetName} ---`);
    console.log('Total Rows:', data.length);
    console.log('First 10 rows:');
    data.slice(0, 10).forEach((row, i) => {
        console.log(`Row ${i}:`, row);
    });
});
