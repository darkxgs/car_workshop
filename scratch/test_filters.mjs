import XLSX from 'xlsx';

const file = 'd:/Programming/Muhemn Work/auto-workshop/66 - Copy.xls';
const workbook = XLSX.readFile(file);
const sheetNames = workbook.SheetNames;
const firstSheet = workbook.Sheets[sheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

const products = [];
for (let i = 9; i < data.length; i++) {
    const row = data[i];
    if (row && row[8]) {
        products.push(String(row[8]).trim());
    }
}

// Check filters
const filters = products.filter(p => p.includes('فلتر'));
console.log('Total filters found:', filters.length);
console.log('Sample filters:');
filters.slice(0, 100).forEach((f, idx) => {
    console.log(`${idx + 1}: ${f}`);
});

// Let's write a splitter function
function splitProduct(pName) {
    // 1. Check viscosity (e.g. 5w30, 0W-20, 20w50)
    // Matches 0W8, 5W-30, 10w40, etc.
    const viscosityRegex = /\b(\d{1,2}[wW][-]?\d{1,2})\b/;
    const viscMatch = pName.match(viscosityRegex);
    let viscosity = null;
    let nameWithoutViscosity = pName;
    if (viscMatch) {
        viscosity = viscMatch[1];
        // Remove viscosity and clean up double spaces/leading/trailing
        nameWithoutViscosity = pName.replace(viscosityRegex, '').replace(/\s+/g, ' ').trim();
    }

    // 2. Check filters (name + code)
    // Usually contains 'فلتر'
    let filterName = null;
    let filterCode = null;
    if (pName.includes('فلتر')) {
        // Find the alphanumeric code, which might look like HP-1003, SO-1017, VF-2000, 33-3080, etc.
        // It's usually at the end or separated by space.
        // Let's extract words.
        const words = pName.split(/\s+/);
        // Let's find if there is a word that looks like a code (e.g., has numbers, hyphens, is alphanumeric)
        // or just take the last word if it has digits/hyphens.
        // Let's check from the end of words.
        for (let i = words.length - 1; i >= 0; i--) {
            const word = words[i];
            const hasNumber = /\d/.test(word);
            const isCode = hasNumber && (word.includes('-') || word.length > 2);
            if (isCode) {
                filterCode = word;
                // filterName is everything before it
                filterName = words.slice(0, i).join(' ') + ' ' + words.slice(i + 1).join(' ');
                filterName = filterName.replace(/\s+/g, ' ').trim();
                break;
            }
        }
    }

    return {
        original: pName,
        viscosity,
        oilName: viscosity ? nameWithoutViscosity : null,
        filterName,
        filterCode
    };
}

console.log('\n--- Test Split ---');
const testCases = [
    'موتل 8100 5w40',
    'ستيرلنك 10W40',
    'ميغوين 5W-30 اخضر',
    'K_N فلتر زيت HP-1003',
    'K_N فلتر تبريد VF-2000',
    'K-N فلتر زيت SO-1002',
    'أصلي فلتر زيت 26300-35505',
    'فلتر هواء 17220-R60-U00'
];

testCases.forEach(tc => {
    console.log(tc, '=>', splitProduct(tc));
});
