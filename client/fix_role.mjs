import { readFileSync, writeFileSync } from 'fs';
const f = 'src/App.jsx';
let c = readFileSync(f, 'utf8');
c = c.replace('role="main" ', '');
writeFileSync(f, c);
console.log('Done: removed role="main" from App.jsx');
