import fs from 'fs';

function addNotesToDetailFields(content) {
    return content.replace(/detailFields:\s*\[([\s\S]*?)\]/g, (match, inner) => {
        if (inner.includes('"notes"')) return match;
        if (inner.trim() === '') return match;

        // Trim the inner string to remove trailing whitespace/newlines
        let trimmedInner = inner.replace(/\s+$/, '');
        // If the last character is a comma, remove it so we can append our own element cleanly
        if (trimmedInner.endsWith(',')) {
            trimmedInner = trimmedInner.slice(0, -1);
        }

        return `detailFields: [${trimmedInner}, { key: "notes", label: "ملاحظات" }]`;
    });
}

function processFile(path) {
    let content = fs.readFileSync(path, 'utf8');
    let newContent = addNotesToDetailFields(content);
    fs.writeFileSync(path, newContent, 'utf8');
    console.log("Processed " + path);
}

processFile('d:/Programming/Muhemn Work/auto-workshop/src/app/reception/components/StandardReception.tsx');
processFile('d:/Programming/Muhemn Work/auto-workshop/src/app/reception/components/SectorReception.tsx');
