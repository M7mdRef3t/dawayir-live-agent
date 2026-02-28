const fs = require('fs');
const filepath = 'client/src/components/DawayirCanvas.jsx';
let content = fs.readFileSync(filepath, 'utf8');

const search = `const lerp = (a, b, t) => a + (b - a) * t;

const lerpColor = (colorA, colorB, t) => {
    const parseHex = (hex) => {
        hex = hex.replace('#', '');
        return [parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16)];
    };

    try {
        const [rA, gA, bA] = parseHex(colorA);
        const [rB, gB, bB] = parseHex(colorB);
        const r = Math.round(lerp(rA, rB, t));
        const g = Math.round(lerp(gA, gB, t));
        const b = Math.round(lerp(bA, bB, t));
        return \`#\${r.toString(16).padStart(2, '0')}\${g.toString(16).padStart(2, '0')}\${b.toString(16).padStart(2, '0')}\`;
    } catch {
        return colorB;
    }
};

const hexToRgba = (hex, alpha) => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return \`rgba(\${r},\${g},\${b},\${alpha})\`;
};`;

const replace = `const lerp = (a, b, t) => a + (b - a) * t;

const hexCache = new Map();

const parseHex = (hex) => {
    let cached = hexCache.get(hex);
    if (cached) return cached;

    let cleanHex = hex;
    if (hex[0] === '#') cleanHex = hex.slice(1);

    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    cached = [r, g, b];
    hexCache.set(hex, cached);
    return cached;
};

const lerpColor = (colorA, colorB, t) => {
    try {
        const [rA, gA, bA] = parseHex(colorA);
        const [rB, gB, bB] = parseHex(colorB);
        const r = Math.round(lerp(rA, rB, t));
        const g = Math.round(lerp(gA, gB, t));
        const b = Math.round(lerp(bA, bB, t));
        return \`#\${r.toString(16).padStart(2, '0')}\${g.toString(16).padStart(2, '0')}\${b.toString(16).padStart(2, '0')}\`;
    } catch {
        return colorB;
    }
};

const hexToRgba = (hex, alpha) => {
    const [r, g, b] = parseHex(hex);
    return \`rgba(\${r},\${g},\${b},\${alpha})\`;
};`;

if (content.includes(search)) {
    content = content.replace(search, replace);
    fs.writeFileSync(filepath, content, 'utf8');
    console.log('File patched successfully');
} else {
    console.log('Search string not found in file');
}
