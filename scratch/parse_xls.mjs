import XLSX from 'xlsx';
import fs from 'fs';

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

const viscosityRegex = /\b(\d{1,2}[wW][-]?\d{1,2})\b/;

const oils = new Set();
const viscosities = new Set();
const filters = new Set();
const filterCodes = new Set();
const batteries = new Set();
const cleanersAndAdditives = new Set();
const gearboxOils = new Set();
const others = new Set();

products.forEach(p => {
    // 1. Viscosity check (Oils)
    const viscMatch = p.match(viscosityRegex);
    if (viscMatch) {
        const visc = viscMatch[1];
        viscosities.add(visc.toUpperCase());
        
        let oil = p.replace(viscosityRegex, '').replace(/\s+/g, ' ').trim();
        // Clean trailing/leading dashes or parentheses
        oil = oil.replace(/^[-()]+|[-()]+$/g, '').trim();
        oils.add(oil);
        return;
    }

    // 2. Filter check
    if (p.toLowerCase().includes('فلتر') || p.toLowerCase().includes('كود')) {
        const words = p.split(/\s+/);
        let foundCode = false;
        for (let i = words.length - 1; i >= 0; i--) {
            const word = words[i];
            const hasNumber = /\d/.test(word);
            const isCode = hasNumber && (word.includes('-') || word.length > 2 || /[A-Za-z]/.test(word));
            if (isCode) {
                let code = word.replace(/[()]/g, '').trim();
                if (code.length > 1) {
                    filterCodes.add(code);
                    let name = words.slice(0, i).join(' ') + ' ' + words.slice(i + 1).join(' ');
                    name = name.replace(/\s+/g, ' ').replace(/[()]/g, '').trim();
                    filters.add(name);
                    foundCode = true;
                    break;
                }
            }
        }
        if (!foundCode) {
            filters.add(p);
        }
        return;
    }

    // 3. Battery check
    if (p.includes('بطارية') || p.includes('بطاريه')) {
        batteries.add(p);
        return;
    }

    // 4. Gearbox / ATF check
    if (p.toLowerCase().includes('atf') || p.toLowerCase().includes('كير') || p.toLowerCase().includes('cvt')) {
        gearboxOils.add(p);
        return;
    }

    // 5. Cleaners and additives
    if (
        p.includes('منظف') || p.includes('فلاش') || p.includes('سيراميك') || 
        p.includes('مانع') || p.includes('واقي') || p.includes('مضاف') || 
        p.includes('لكوي مولي') || p.includes('ستوب') || p.includes('اوكتان')
    ) {
        cleanersAndAdditives.add(p);
        return;
    }

    // 6. Others
    others.add(p);
});

const result = {
    oils: Array.from(oils).sort(),
    viscosities: Array.from(viscosities).sort(),
    filters: Array.from(filters).sort(),
    filterCodes: Array.from(filterCodes).sort(),
    batteries: Array.from(batteries).sort(),
    cleanersAndAdditives: Array.from(cleanersAndAdditives).sort(),
    gearboxOils: Array.from(gearboxOils).sort(),
    others: Array.from(others).sort()
};

fs.writeFileSync('d:/Programming/Muhemn Work/auto-workshop/src/lib/data/sectorBranchCatalog.json', JSON.stringify(result, null, 2));

console.log('Sector Branch Catalog generated successfully!');
console.log('Oils:', result.oils.length);
console.log('Viscosities:', result.viscosities.length);
console.log('Filters:', result.filters.length);
console.log('Filter Codes:', result.filterCodes.length);
console.log('Batteries:', result.batteries.length);
console.log('Additives:', result.cleanersAndAdditives.length);
console.log('Gearbox Oils:', result.gearboxOils.length);
console.log('Others:', result.others.length);
