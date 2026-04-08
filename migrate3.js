const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'app');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(srcDir, (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Remaining Hex Backgrounds
    content = content.replace(/bg-\[#111\]/g, 'bg-muted');
    content = content.replace(/bg-\[#050505\]/g, 'bg-card');
    content = content.replace(/bg-\[#1a1a1a\]/g, 'bg-card');
    content = content.replace(/bg-\[#141414\]/g, 'bg-muted');
    content = content.replace(/bg-\[#121212\]/g, 'bg-background');

    // Specific Hardcoded Blacks
    content = content.replace(/bg-black\/40/g, 'bg-background/40');
    content = content.replace(/bg-black\/50/g, 'bg-background/50');
    content = content.replace(/bg-black\/60/g, 'bg-background/60');
    content = content.replace(/bg-black\/80/g, 'bg-background/80');
    content = content.replace(/bg-black\/90/g, 'bg-background/90');
    
    // Some components use `bg-black` for pill backgrounds or inputs
    // We shouldn't replace literal "bg-black" globally unless it's safe. 
    // In our case it was used for inputs, tables, headers. 
    // Wait, replacing 'bg-black ' with 'bg-background ' is safe for layout elements (but can break gradients like from-black).
    content = content.replace(/bg-black(?=[\s"'\`])/g, 'bg-background');

    // Hover states
    content = content.replace(/hover:bg-\[#1a1a1a\]/g, 'hover:bg-card');
    content = content.replace(/hover:bg-\[#141414\]/g, 'hover:bg-muted');
    content = content.replace(/hover:bg-\[#111\]/g, 'hover:bg-muted');
    content = content.replace(/hover:bg-black/g, 'hover:bg-background');
    content = content.replace(/hover:bg-slate-700/g, 'hover:bg-muted');
    content = content.replace(/hover:bg-slate-800/g, 'hover:bg-muted');
    content = content.replace(/hover:text-white/g, 'hover:text-foreground');

    // Borders
    content = content.replace(/border-slate-800\/80/g, 'border-border');
    content = content.replace(/border-slate-800\/40/g, 'border-border');
    content = content.replace(/border-slate-800\/30/g, 'border-border');
    content = content.replace(/border-slate-700\/50/g, 'border-border');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed:', filePath);
    }
});
