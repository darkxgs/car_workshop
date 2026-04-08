const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

// Regex to replace class substrings
walkDir(srcDir, (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Backgrounds & Gradients
    content = content.replace(/bg-\[#1a1a1a\]/g, 'bg-card border-border'); // #1a1a1a was usually a secondary input or floating bar
    content = content.replace(/bg-\[#141414\]/g, 'bg-muted');      // #141414 was usually a hovered card inner layer
    content = content.replace(/bg-\[#121212\]/g, 'bg-background');
    content = content.replace(/to-\[#121212\]/g, 'to-[var(--color-background)]');
    
    // Transparent darks (like overlays or glass). In light mode this must be lighter.
    // Changing bg-black/60 -> bg-card/80
    content = content.replace(/bg-black\/60/g, 'bg-card/80');
    // Changing bg-black/50 -> bg-muted/80
    content = content.replace(/bg-black\/50/g, 'bg-muted/80');
    // Changing hover:bg-black/50 -> hover:bg-muted
    content = content.replace(/hover:bg-black\/50/g, 'hover:bg-muted');
    // Changing border-border border -> border-border border
    content = content.replace(/border-white\/5/g, 'border-border');
    content = content.replace(/border-white\/10/g, 'border-border');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated HEX:', filePath);
    }
});
