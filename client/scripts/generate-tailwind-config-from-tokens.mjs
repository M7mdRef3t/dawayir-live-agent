import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const tokensPath = path.join(root, 'src', 'design-system', 'tokens.principal.v1.json');
const outPath = path.join(root, 'tailwind.config.generated.cjs');

const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));

const pickScale = (obj) => Object.fromEntries(
  Object.entries(obj || {}).map(([k, v]) => [k, typeof v === 'string' ? v : String(v)])
);

const brand = tokens?.color?.brand || {};
const colors = {};
for (const [name, scale] of Object.entries(brand)) {
  colors[name] = pickScale(scale);
}
colors.semantic = tokens?.color?.semantic || {};

const spacing = pickScale(tokens?.spacing || {});
const radius = pickScale(tokens?.radius || {});
const shadows = pickScale(tokens?.shadow || {});
const fontFamily = {
  sans: (tokens?.typography?.fontFamily?.primary || '').split(',').map((x) => x.trim()).filter(Boolean),
  secondary: (tokens?.typography?.fontFamily?.secondary || '').split(',').map((x) => x.trim()).filter(Boolean),
};
const fontSize = Object.fromEntries(
  Object.entries(tokens?.typography?.scale || {}).map(([k, v]) => [k, [v.size, { lineHeight: v.lineHeight }]])
);

const content = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: ${JSON.stringify(colors, null, 6)},
      spacing: ${JSON.stringify(spacing, null, 6)},
      borderRadius: ${JSON.stringify(radius, null, 6)},
      boxShadow: ${JSON.stringify(shadows, null, 6)},
      fontFamily: ${JSON.stringify(fontFamily, null, 6)},
      fontSize: ${JSON.stringify(fontSize, null, 6)}
    }
  },
  plugins: []
};
`;

fs.writeFileSync(outPath, content, 'utf8');
console.log(`Generated ${outPath}`);
