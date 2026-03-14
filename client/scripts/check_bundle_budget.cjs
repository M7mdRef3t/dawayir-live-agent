const fs = require('node:fs');
const path = require('node:path');

const distAssets = path.join(__dirname, '..', 'dist', 'assets');
const limits = {
  jsBytes: 450 * 1024,
  cssBytes: 128 * 1024,
};

const getFiles = (ext) => fs.readdirSync(distAssets).filter((name) => name.endsWith(ext));
const getTotalSize = (files) => files.reduce((sum, file) => {
  const stat = fs.statSync(path.join(distAssets, file));
  return sum + stat.size;
}, 0);
const pickEntryLike = (files, ext) => {
  const entryLike = files.filter((name) => name.startsWith(`index-`) && name.endsWith(ext));
  if (entryLike.length > 0) return entryLike;
  const sorted = [...files].sort((a, b) => {
    const aSize = fs.statSync(path.join(distAssets, a)).size;
    const bSize = fs.statSync(path.join(distAssets, b)).size;
    return bSize - aSize;
  });
  return sorted.slice(0, 1);
};

if (!fs.existsSync(distAssets)) {
  console.error('dist/assets not found. Run build first.');
  process.exit(1);
}

const jsFiles = getFiles('.js');
const cssFiles = getFiles('.css');
const criticalJs = pickEntryLike(jsFiles, '.js');
const criticalCss = pickEntryLike(cssFiles, '.css');
const jsTotal = getTotalSize(criticalJs);
const cssTotal = getTotalSize(criticalCss);

console.log(`Bundle sizes (critical path) => JS: ${jsTotal} bytes [${criticalJs.join(', ')}], CSS: ${cssTotal} bytes [${criticalCss.join(', ')}]`);

if (jsTotal > limits.jsBytes) {
  console.error(`JS budget exceeded: ${jsTotal} > ${limits.jsBytes}`);
  process.exit(1);
}

if (cssTotal > limits.cssBytes) {
  console.error(`CSS budget exceeded: ${cssTotal} > ${limits.cssBytes}`);
  process.exit(1);
}

console.log('Bundle budget check passed.');
