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

const colorMap = {
    'bg-slate-900': 'bg-card',
    'bg-[#050505]': 'bg-background',
    'bg-[#0a0a0a]': 'bg-card',
    'bg-slate-800': 'bg-muted',
    'border-slate-800': 'border-border',
    'border-white/10': 'border-border',
    'border-white/20': 'border-border',
    'border-slate-700': 'border-border',
    'border-rose-900/30': 'border-border',
    'border-rose-900/40': 'border-border',
    'border-slate-800/50': 'border-border',
    'text-slate-400': 'text-muted-foreground',
    'text-slate-500': 'text-muted-foreground',
    'text-slate-300': 'text-muted-foreground',
    'text-slate-200': 'text-foreground',
};

// Patterns where `text-white` SHOULD NOT be replaced. E.g. anything containing bg-rose, bg-emerald, etc.
const keepWhitePatterns = /(bg-rose-|bg-emerald-|bg-blue-|bg-indigo-|bg-red-|bg-[#be123c]|LOGO_BG|btn-|text-white\s*\})/i;

walkDir(srcDir, (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Apply basic mapping
    for (const [key, val] of Object.entries(colorMap)) {
        // match exact word-boundaries (except for special chars like [] or /)
        // A safer way is string replace all for class names, but since they act as separate words in className attributes:
        const regex = new RegExp(`(?<=\\s|["'\`])${key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}(?=\\s|["'\`])`, 'g');
        content = content.replace(regex, val);
    }
    
    // special handling for bg-slate-900/x -> bg-card/x
    content = content.replace(/(?<=[\s"'\`])bg-slate-900\/(\d+)(?=[ \s"'\`])/g, 'bg-card/$1');
    content = content.replace(/(?<=[\s"'\`])bg-\[#0a0a0a\]\/(\d+)(?=[ \s"'\`])/g, 'bg-card/$1');
    content = content.replace(/(?<=[\s"'\`])bg-slate-800\/(\d+)(?=[ \s"'\`])/g, 'bg-muted/$1');

    // Handle text-white Replacement
    // We split into lines to analyze context before replacing
    let lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.includes('text-white')) {
            if (!keepWhitePatterns.test(line)) {
                // Not evidently a colored button. Change it.
                lines[i] = line.replace(/(?<=[\s"'\`])text-white(?=[\s"'\`])/g, 'text-foreground');
            }
        }
    }
    content = lines.join('\n');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated:', filePath);
    }
});
