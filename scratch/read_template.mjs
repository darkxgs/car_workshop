import * as xlsx from 'xlsx';

try {
    const workbook = xlsx.readFile('d:\\Programming\\Muhemn Work\\auto-workshop\\66 - Copy.xls');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    console.log("Sheet Name:", sheetName);
    console.log("First 5 rows:");
    console.log(data.slice(0, 5));
} catch (e) {
    console.error("Error reading file:", e);
}
