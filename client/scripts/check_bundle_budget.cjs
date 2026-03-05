const fs = require('node:fs');
const path = require('node:path');

const distAssets = path.join(__dirname, '..', 'dist', 'assets');
const limits = {
  jsBytes: 450 * 1024,
  cssBytes: 120 * 1024,
};

const getFiles = (ext) => fs.readdirSync(distAssets).filter((name) => name.endsWith(ext));
const getTotalSize = (files) => files.reduce((sum, file) => {
  const stat = fs.statSync(path.join(distAssets, file));
  return sum + stat.size;
}, 0);

if (!fs.existsSync(distAssets)) {
  console.error('dist/assets not found. Run build first.');
  process.exit(1);
}

const jsFiles = getFiles('.js');
const cssFiles = getFiles('.css');
const jsTotal = getTotalSize(jsFiles);
const cssTotal = getTotalSize(cssFiles);

console.log(`Bundle sizes => JS: ${jsTotal} bytes, CSS: ${cssTotal} bytes`);

if (jsTotal > limits.jsBytes) {
  console.error(`JS budget exceeded: ${jsTotal} > ${limits.jsBytes}`);
  process.exit(1);
}

if (cssTotal > limits.cssBytes) {
  console.error(`CSS budget exceeded: ${cssTotal} > ${limits.cssBytes}`);
  process.exit(1);
}

console.log('Bundle budget check passed.');
