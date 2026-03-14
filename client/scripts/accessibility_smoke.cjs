const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'App.jsx');
const canvasPath = path.join(__dirname, '..', 'src', 'components', 'DawayirCanvas.jsx');
const dashboardPath = path.join(__dirname, '..', 'src', 'components', 'DashboardView.jsx');
const welcomePath = path.join(__dirname, '..', 'src', 'components', 'WelcomeScreen.jsx');
const overlayPath = path.join(__dirname, '..', 'src', 'components', 'SessionOverlayPanel.jsx');
const transcriptPath = path.join(__dirname, '..', 'src', 'components', 'TranscriptPanel.jsx');
const completePath = path.join(__dirname, '..', 'src', 'components', 'SessionCompleteScreen.jsx');

const app = fs.readFileSync(appPath, 'utf8');
const canvas = fs.readFileSync(canvasPath, 'utf8');
const dashboard = fs.readFileSync(dashboardPath, 'utf8');
const welcome = fs.readFileSync(welcomePath, 'utf8');
const overlay = fs.readFileSync(overlayPath, 'utf8');
const transcript = fs.readFileSync(transcriptPath, 'utf8');
const complete = fs.readFileSync(completePath, 'utf8');

const checks = [
  { name: 'Skip link present', pass: app.includes('className="skip-link"') },
  { name: 'Main landmark present', pass: app.includes('role="main"') },
  { name: 'Complementary landmark present', pass: overlay.includes('role="complementary"') },
  { name: 'Status live region present', pass: app.includes('role="status"') || app.includes('StatusBadge') },
  { name: 'Dynamic html lang update', pass: app.includes('document.documentElement.lang') },
  { name: 'Dynamic html dir update', pass: app.includes('document.documentElement.dir') },
  { name: 'View focus headings present', pass: welcome.includes('data-view-heading="welcome"') && overlay.includes('data-view-heading="setup"') && overlay.includes('data-view-heading="live"') && complete.includes('data-view-heading="complete"') && dashboard.includes('viewHeadingProps') },
  { name: 'Screen reader announcer present', pass: app.includes('ref={srAnnouncerRef}') && app.includes('aria-atomic="true"') },
  { name: 'Transcript toggle announces expanded state', pass: transcript.includes('aria-expanded={isTranscriptVisible}') && transcript.includes('aria-controls="live-transcript"') },
  { name: 'Transcript log semantics present', pass: transcript.includes('id="live-transcript"') && transcript.includes('role="log"') && transcript.includes('aria-relevant="additions text"') },
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
