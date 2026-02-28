const lerp = (a, b, t) => a + (b - a) * t;

const lerpColorOriginal = (colorA, colorB, t) => {
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
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch {
        return colorB;
    }
};

const hexToRgbaOriginal = (hex, alpha) => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
};

// Optimized versions
const hexCache = new Map();
const parseHexOptimized = (hex) => {
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

const lerpColorOptimized = (colorA, colorB, t) => {
    try {
        const [rA, gA, bA] = parseHexOptimized(colorA);
        const [rB, gB, bB] = parseHexOptimized(colorB);
        const r = Math.round(lerp(rA, rB, t));
        const g = Math.round(lerp(gA, gB, t));
        const b = Math.round(lerp(bA, bB, t));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch {
        return colorB;
    }
};

const hexToRgbaOptimized = (hex, alpha) => {
    const [r, g, b] = parseHexOptimized(hex);
    return `rgba(${r},${g},${b},${alpha})`;
};

const ITERATIONS = 1000000;

console.time('lerpColorOriginal');
for (let i = 0; i < ITERATIONS; i++) {
    lerpColorOriginal('#00F5FF', '#FF00E5', 0.5);
}
console.timeEnd('lerpColorOriginal');

console.time('lerpColorOptimized');
for (let i = 0; i < ITERATIONS; i++) {
    lerpColorOptimized('#00F5FF', '#FF00E5', 0.5);
}
console.timeEnd('lerpColorOptimized');

console.time('hexToRgbaOriginal');
for (let i = 0; i < ITERATIONS; i++) {
    hexToRgbaOriginal('#00F5FF', 0.5);
}
console.timeEnd('hexToRgbaOriginal');

console.time('hexToRgbaOptimized');
for (let i = 0; i < ITERATIONS; i++) {
    hexToRgbaOptimized('#00F5FF', 0.5);
}
console.timeEnd('hexToRgbaOptimized');
