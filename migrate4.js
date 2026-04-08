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

const coloredBgs = ['bg-rose', 'bg-emerald', 'bg-blue', 'bg-purple', 'bg-amber', 'bg-red', 'bg-indigo'];

walkDir(srcDir, (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // We process line by line.
    let lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.includes('text-white')) {
            // Check if the line has a colored background or 'btn-' class which are typically colored
            let hasColoredBg = coloredBgs.some(c => line.includes(c)) || line.includes('btn-');
            if (!hasColoredBg) {
                // If it doesn't have a colored background, the text-white is an artifact of the hardcoded dark theme. Replace it.
                lines[i] = line.replace(/text-white/g, 'text-foreground');
            }
        }
    }
    content = lines.join('\n');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed text-white:', filePath);
    }
});
