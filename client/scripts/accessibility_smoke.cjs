const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'App.jsx');
const canvasPath = path.join(__dirname, '..', 'src', 'components', 'DawayirCanvas.jsx');

const app = fs.readFileSync(appPath, 'utf8');
const canvas = fs.readFileSync(canvasPath, 'utf8');

const checks = [
  { name: 'Skip link present', pass: app.includes('className="skip-link"') },
  { name: 'Main landmark present', pass: app.includes('role="main"') },
  { name: 'Complementary landmark present', pass: app.includes('role="complementary"') },
  { name: 'Status live region present', pass: app.includes('role="status"') || app.includes('StatusBadge') },
  { name: 'Dynamic html lang update', pass: app.includes('document.documentElement.lang') },
  { name: 'Dynamic html dir update', pass: app.includes('document.documentElement.dir') },
  { name: 'Canvas role img present', pass: canvas.includes('role="img"') },
  { name: 'Canvas aria-label present', pass: canvas.includes('aria-label=') },
  { name: 'Canvas touch support present', pass: canvas.includes('onTouchStart=') && canvas.includes('onTouchMove=') },
];

const failed = checks.filter((check) => !check.pass);

if (failed.length > 0) {
  console.error('Accessibility smoke checks failed:');
  failed.forEach((f) => console.error(`- ${f.name}`));
  process.exit(1);
}

console.log(`Accessibility smoke checks passed (${checks.length}/${checks.length}).`);
