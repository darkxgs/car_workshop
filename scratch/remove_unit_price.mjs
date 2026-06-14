import fs from 'fs';

const files = [
    'd:/Programming/Muhemn Work/auto-workshop/src/app/reception/components/StandardReception.tsx',
    'd:/Programming/Muhemn Work/auto-workshop/src/app/reception/components/SectorReception.tsx'
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove { key: "unitPrice", label: "..." },
    content = content.replace(/\{\s*key:\s*["']unitPrice["'][^}]+}(,?)/g, '');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
}
