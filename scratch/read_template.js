const xlsx = require('xlsx');

try {
    const workbook = xlsx.readFile('d:\\Programming\\Muhemn Work\\auto-workshop\\66 - Copy.xls');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    console.log("Sheet Name:", sheetName);
    console.log("First 10 rows:");
    console.log(JSON.stringify(data.slice(0, 10), null, 2));
} catch (e) {
    console.error("Error reading file:", e);
}
