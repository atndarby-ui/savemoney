const fs = require('fs');
const path = require('path');

const svgPath = '/Users/darby/Downloads/Color.svg';
const outputDir = '/Users/darby/Documents/money/assets/icons/3d';

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Reading SVG file...');
const svgContent = fs.readFileSync(svgPath, 'utf8');

console.log('Extracting images...');
// Regex to catch both href and xlink:href, single or double quotes
const regex = /(?:xlink:)?href=["']data:image\/png;base64,([^"']+)["']/g;
let match;
let count = 0;

while ((match = regex.exec(svgContent)) !== null) {
    const base64Data = match[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `extracted_${count}.png`;
    fs.writeFileSync(path.join(outputDir, fileName), buffer);
    console.log(`Saved ${fileName}`);
    count++;
}

console.log(`\nExtracted ${count} images to ${outputDir}`);
