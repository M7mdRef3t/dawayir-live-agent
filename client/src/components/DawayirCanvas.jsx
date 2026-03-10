import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, memo } from 'react';

const lerp = (a, b, t) => a + (b - a) * t;


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
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch {
        return colorB;
    }
};

const hexToRgba = (hex, alpha) => {
    const [r, g, b] = parseHex(hex);
    return `rgba(${r},${g},${b},${alpha})`;
};

const getCssVar = (name, fallback) => {
    if (typeof window === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
};

// ══════════════════════════════════════════════
// FEATURE 1: COGNITIVE AURA
// Full-screen tinted gradient that shifts based on
// which circle is currently dominant (largest).
// Completely invisible as a conscious effect —
// the user FEELS it, not sees it. Pure biofeedback.
// ══════════════════════════════════════════════

// ── CHROMOTHERAPY COLOR MAP ──────────────────────────────────
// Colors chosen based on color therapy research:
// Blue calms (lowers heart rate), Green grounds (safety),
// Gold affirms (self-worth), Violet deepens (introspection),
// Warm white signals clarity (alignment).

const CHROMO_STATES = {
    stressed:  { r: 20, g: 40, b: 80 },   // deep blue — calming
    confused:  { r: 15, g: 50, b: 45 },   // teal-green — grounding
    selfaware: { r: 50, g: 38, b: 8 },    // warm gold — affirmation
    clarity:   { r: 40, g: 25, b: 55 },   // soft violet — insight
    avoidance: { r: 20, g: 22, b: 35 },   // grey-blue — gentle confrontation
    neutral:   { r: 4, g: 4, b: 15 },     // near-black default
};

const getChromoState = (nodes) => {
    if (!nodes || nodes.length < 3) return CHROMO_STATES.neutral;
    const n1 = nodes.find(n => n.id === 1)?.radius ?? 50; // أنت
    const n2 = nodes.find(n => n.id === 2)?.radius ?? 50; // العلم
    const n3 = nodes.find(n => n.id === 3)?.radius ?? 50; // الواقع
    const avgFluidity = nodes.reduce((s, n) => s + (n.fluidity ?? 0.5), 0) / nodes.length;

    // All low → avoidance (grey-blue)
    if (n1 < 42 && n2 < 42 && n3 < 42) return CHROMO_STATES.avoidance;
    // All high & aligned → clarity (violet)
    if (n1 > 55 && n2 > 55 && n3 > 55) return CHROMO_STATES.clarity;
    // High fluidity → stressed (calming blue)
    if (avgFluidity > 0.65) return CHROMO_STATES.stressed;
    // Self-awareness dominant → gold
    if (n1 > n2 + 15 && n1 > n3 + 15) return CHROMO_STATES.selfaware;
    // Low fluidity, grounded → green
    if (avgFluidity < 0.35) return CHROMO_STATES.confused;
    return CHROMO_STATES.neutral;
};

// Smooth transition between chromo states
let prevChromoR = 4, prevChromoG = 4, prevChromoB = 15;

const drawBackground = (ctx, canvasWidth, canvasHeight, color, nodes) => {
    // Base fill
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (!nodes || nodes.length === 0) return;

    // ── Chromotherapy ambient layer ──────────────────────────
    const target = getChromoState(nodes);
    const chromoLerp = 0.02; // very slow transition
    prevChromoR = prevChromoR + (target.r - prevChromoR) * chromoLerp;
    prevChromoG = prevChromoG + (target.g - prevChromoG) * chromoLerp;
    prevChromoB = prevChromoB + (target.b - prevChromoB) * chromoLerp;

    const cr = Math.round(prevChromoR);
    const cg = Math.round(prevChromoG);
    const cb = Math.round(prevChromoB);

    // Full-screen therapeutic tint (extremely subtle — felt, not seen)
    const chromoGrd = ctx.createRadialGradient(
        canvasWidth / 2, canvasHeight / 2, 0,
        canvasWidth / 2, canvasHeight / 2,
        Math.max(canvasWidth, canvasHeight) * 0.7
    );
    chromoGrd.addColorStop(0, `rgba(${cr},${cg},${cb},0.18)`);
    chromoGrd.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.10)`);
    chromoGrd.addColorStop(1, `rgba(${cr},${cg},${cb},0.03)`);
    ctx.fillStyle = chromoGrd;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // ── Original dominant-node aura (on top of chromo) ──────
    const dominant = nodes.reduce((a, b) => a.radius > b.radius ? a : b);
    const dominantColor = dominant.color;
    const intensity = Math.min(0.06, (dominant.radius - 60) / 1200);

    const grd = ctx.createRadialGradient(
        dominant.x, dominant.y, 0,
        canvasWidth / 2, canvasHeight / 2,
        Math.max(canvasWidth, canvasHeight) * 0.8
    );
    const [r, g, b] = parseHex(dominantColor);
    grd.addColorStop(0, `rgba(${r},${g},${b},${intensity * 2})`);
    grd.addColorStop(0.5, `rgba(${r},${g},${b},${intensity})`);
    grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
};

// ══════════════════════════════════════════════
// FEATURE 2: PARTICLE GRAVITY FIELD
// Particles drift toward the dominant node,
// creating a living "gravity well" effect.
// ══════════════════════════════════════════════

const drawParticles = (ctx, particles, canvasWidth, canvasHeight, nodes) => {
    const dominant = nodes && nodes.length > 0
        ? nodes.reduce((a, b) => a.radius > b.radius ? a : b)
        : null;

    particles.forEach(p => {
        // Gravity toward dominant node (very subtle)
        if (dominant) {
            const dx = dominant.x - p.x;
            const dy = dominant.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const gravityStr = Math.min(0.04, 400 / (dist * dist));
            p.speedX += (dx / dist) * gravityStr;
            p.speedY += (dy / dist) * gravityStr;
            // Cap speed to prevent particles vanishing
            const spd = Math.sqrt(p.speedX * p.speedX + p.speedY * p.speedY);
            if (spd > 0.6) { p.speedX *= 0.6 / spd; p.speedY *= 0.6 / spd; }
        }

        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = canvasWidth;
        if (p.x > canvasWidth) p.x = 0;
        if (p.y < 0) p.y = canvasHeight;
        if (p.y > canvasHeight) p.y = 0;

        const color = dominant ? dominant.color : '#ffffff';
        const [r, g, b] = parseHex(color);
        ctx.globalAlpha = p.opacity * 0.7;
        ctx.fillStyle = `rgba(${r},${g},${b},1)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
};


// ══════════════════════════════════════════════
// SATELLITE NODES — Cognitive Topic Layer
// Small nodes orbiting parent circles, represent
// the topics actively driving each mental state.
// Max 2 per circle, fade after 8 seconds.
// ══════════════════════════════════════════════

const SATELLITE_LIFETIME_MS = 8000;
const MAX_SATELLITES_PER_NODE = 2;
const SATELLITE_ORBIT_RADIUS_FACTOR = 1.7; // relative to parent radius

const updateSatellites = (satellites, nodes, now) => {
    // Age & remove expired
    const alive = satellites.filter(s => now - s.createdAt < SATELLITE_LIFETIME_MS);
    // Orbit animation
    alive.forEach(s => {
        s.orbitAngle += 0.008 + s.orbitSpeed;
        const parent = nodes.find(n => n.id === s.parentId);
        if (parent) {
            const orbitR = parent.radius * SATELLITE_ORBIT_RADIUS_FACTOR + s.orbitOffset;
            s.x = parent.x + Math.cos(s.orbitAngle) * orbitR;
            s.y = parent.y + Math.sin(s.orbitAngle) * orbitR;
        }
    });
    return alive;
};

const drawSatellites = (ctx, satellites, nodes, now) => {
    satellites.forEach(s => {
        const age = now - s.createdAt;
        const fadeIn = Math.min(1, age / 400);
        const fadeOut = Math.max(0, 1 - (age - SATELLITE_LIFETIME_MS * 0.6) / (SATELLITE_LIFETIME_MS * 0.4));
        const opacity = fadeIn * fadeOut;
        if (opacity < 0.01) return;

        const parent = nodes.find(n => n.id === s.parentId);
        const color = parent ? parent.color : '#ffffff';

        // Connection line to parent
        if (parent) {
            ctx.beginPath();
            ctx.moveTo(parent.x, parent.y);
            ctx.lineTo(s.x, s.y);
            ctx.strokeStyle = hexToRgba(color, opacity * 0.3);
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Satellite glow
        const r = s.radius;
        const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 2.2);
        grd.addColorStop(0, hexToRgba(color, opacity * 0.4));
        grd.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Main body
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, opacity * 0.55);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(color, opacity * 0.9);
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Label
        if (r > 10) {
            const fontSize = Math.max(8, r * 0.7);
            ctx.font = `600 ${fontSize}px 'Outfit', sans-serif`;
            ctx.fillStyle = `rgba(255,255,255,${opacity * 0.9})`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(s.label.slice(0, 6), s.x, s.y);
        }
    });
};

// ══════════════════════════════════════════════
// SESSION TIMELINE — Records circle states over time
// Drawn as a mini sparkline at the bottom of canvas
// ══════════════════════════════════════════════


// ══════════════════════════════════════════════════
// THE OTHER PERSON — دايرة الآخر
// A smaller blob that appears when the user mentions
// someone specific. Connected to "أنت" by a colored
// link that represents the relationship quality.
// Auto-fades after 5 minutes without re-mention.
// ══════════════════════════════════════════════════

const OTHER_FADE_MS = 300000; // 5 minutes

const drawOtherNode = (ctx, otherNode, selfNode, now) => {
    if (!otherNode || !selfNode) return;

    const elapsed = now - otherNode.born;
    const sinceLastMention = now - otherNode.lastMentioned;

    // Auto-fade after 5 min
    if (sinceLastMention > OTHER_FADE_MS) {
        otherNode.targetRadius = 0;
        otherNode.targetOpacity = 0;
    }

    // Animate radius and opacity
    const lerpSpd = 0.06;
    otherNode.radius += (otherNode.targetRadius - otherNode.radius) * lerpSpd;
    otherNode.opacity += (otherNode.targetOpacity - otherNode.opacity) * lerpSpd;

    if (otherNode.radius < 1 && otherNode.targetRadius === 0) return null; // fully gone

    const r = otherNode.radius;
    const cx = otherNode.x;
    const cy = otherNode.y;
    const alpha = otherNode.opacity;
    const tension = otherNode.tension;
    const color = otherNode.color;

    // ── CONNECTION LINE to "أنت" ────────────────────────
    const grad = ctx.createLinearGradient(selfNode.x, selfNode.y, cx, cy);
    // Line color intensity based on tension
    const lineAlpha = alpha * (0.15 + tension * 0.25);
    grad.addColorStop(0, hexToRgba(selfNode.color, lineAlpha));
    grad.addColorStop(1, hexToRgba(color, lineAlpha));
    ctx.beginPath();
    ctx.moveTo(selfNode.x, selfNode.y);

    // Curved connection — tension = more curve
    const midX = (selfNode.x + cx) / 2 + Math.sin(now * 0.001) * tension * 30;
    const midY = (selfNode.y + cy) / 2 - 20 - tension * 15;
    ctx.quadraticCurveTo(midX, midY, cx, cy);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5 + tension * 1.5;
    ctx.setLineDash(tension > 0.6 ? [4, 6] : []); // dashed if high tension
    ctx.stroke();
    ctx.setLineDash([]);

    // Tension spark on line (for high tension)
    if (tension > 0.5) {
        const sparkT = ((now * 0.002) % 1);
        const sx = selfNode.x + (cx - selfNode.x) * sparkT;
        const sy = selfNode.y + (cy - selfNode.y) * sparkT - Math.sin(sparkT * Math.PI) * tension * 20;
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(color, alpha * 0.6);
        ctx.fill();
    }

    // ── THE OTHER — blob shape (same as "أنت" but smaller) ──
    // Outer glow
    ctx.beginPath();
    const glowSteps = 50;
    for (let i = 0; i <= glowSteps; i++) {
        const theta = (i / glowSteps) * Math.PI * 2;
        const wave = 0.12 + tension * 0.15;
        let wr = (r + 4) * (1 + Math.sin(theta * 4 + now * 0.002) * wave);
        const px = cx + Math.cos(theta) * wr;
        const py = cy + Math.sin(theta) * wr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = hexToRgba(color, alpha * 0.12);
    ctx.fill();

    // Main body
    ctx.beginPath();
    for (let i = 0; i <= glowSteps; i++) {
        const theta = (i / glowSteps) * Math.PI * 2;
        const wave = 0.10 + tension * 0.12;
        let wr = r * (1 + Math.sin(theta * 4 + now * 0.002) * wave);
        const px = cx + Math.cos(theta) * wr;
        const py = cy + Math.sin(theta) * wr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = hexToRgba(color, alpha * 0.5);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(color, alpha * 0.7);
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Name label
    if (r > 15) {
        const fontSize = Math.max(9, Math.floor(r / 2.8));
        ctx.font = `600 ${fontSize}px 'Outfit', sans-serif`;
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(otherNode.name, cx, cy);
    }

    return otherNode; // still alive
};


// ══════════════════════════════════════════════════
// DIVINE VOICE ORB — "Sound from the Cosmos"
// A celestial orb that appears at canvas center when
// Dawayir speaks, creating an otherworldly presence.
// Pulsing rings, gold particles, and light beams
// that reach out to touch the three circles.
// ══════════════════════════════════════════════════

const DIVINE_ORB_PARTICLES_MAX = 24;

const spawnOrbParticles = (particles, cx, cy, now) => {
    // Spawn 1-2 new particles per frame
    const toSpawn = Math.random() < 0.6 ? 1 : 2;
    for (let i = 0; i < toSpawn && particles.length < DIVINE_ORB_PARTICLES_MAX; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 0.8;
        particles.push({
            x: cx + (Math.random() - 0.5) * 20,
            y: cy + (Math.random() - 0.5) * 20,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.2, // drift upwards
            size: 1 + Math.random() * 2.5,
            life: 1.0,
            decay: 0.008 + Math.random() * 0.012,
            born: now,
        });
    }
    return particles;
};

const drawDivineOrb = (ctx, canvasWidth, canvasHeight, nodes, amp, now) => {
    const cx = canvasWidth / 2;
    const cy = canvasHeight * 0.42;

    // Subtle canvas dim — darkens everything slightly for focus
    ctx.fillStyle = `rgba(0, 0, 0, ${0.08 + amp * 0.12})`;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // ── 1. AURORA — wide soft glow behind the orb ────────────────
    const auroraR = 180 + amp * 120;
    const auroraGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, auroraR);
    auroraGrd.addColorStop(0, `rgba(255, 215, 0, ${0.04 + amp * 0.06})`);
    auroraGrd.addColorStop(0.4, `rgba(255, 180, 0, ${0.02 + amp * 0.03})`);
    auroraGrd.addColorStop(0.7, `rgba(200, 120, 255, ${0.01 + amp * 0.02})`);
    auroraGrd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(cx, cy, auroraR, 0, Math.PI * 2);
    ctx.fillStyle = auroraGrd;
    ctx.fill();

    // ── 2. SHOCKWAVE RINGS — expanding circles ────────────────────
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
        const phase = ((now * 0.0008) + i * 0.33) % 1.0;
        const ringR = 20 + phase * (100 + amp * 80);
        const ringOpacity = (1 - phase) * (0.12 + amp * 0.18);
        if (ringOpacity < 0.01) continue;

        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${ringOpacity})`;
        ctx.lineWidth = 1.5 - phase;
        ctx.stroke();
    }

    // ── 3. CORE ORB — the divine source ───────────────────────────
    const orbR = 16 + amp * 22;
    const pulse = Math.sin(now * 0.006) * 0.3 + 0.7; // 0.4..1.0

    // Inner orb glow
    const orbGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR * 2);
    orbGrd.addColorStop(0, `rgba(255, 240, 200, ${0.7 * pulse})`);
    orbGrd.addColorStop(0.3, `rgba(255, 200, 80, ${0.4 * pulse})`);
    orbGrd.addColorStop(0.6, `rgba(255, 150, 0, ${0.12 * pulse})`);
    orbGrd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(cx, cy, orbR * 2, 0, Math.PI * 2);
    ctx.fillStyle = orbGrd;
    ctx.fill();

    // Solid core
    ctx.beginPath();
    ctx.arc(cx, cy, orbR * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 245, 220, ${0.6 + amp * 0.4})`;
    ctx.fill();

    // Rotating halo
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(now * 0.0003);
    ctx.beginPath();
    ctx.arc(0, 0, orbR * 1.1, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.25 + amp * 0.25})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // ── 4. LIGHT BEAMS to circles ────────────────────────────────
    if (nodes && nodes.length > 0 && amp > 0.05) {
        nodes.forEach((node, idx) => {
            const beamPhase = ((now * 0.001) + idx * 0.4) % 1.0;
            const beamOpacity = amp * 0.15 * Math.sin(beamPhase * Math.PI);
            if (beamOpacity < 0.01) return;

            const grad = ctx.createLinearGradient(cx, cy, node.x, node.y);
            grad.addColorStop(0, `rgba(255, 215, 0, ${beamOpacity * 1.5})`);
            grad.addColorStop(0.5, `rgba(255, 200, 100, ${beamOpacity * 0.6})`);
            grad.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(node.x, node.y);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = Math.min(1, beamOpacity * 3);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        });
    }
};

const updateOrbParticles = (ctx, particles, now) => {
    const alive = [];
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.003; // slight upwards drift
        p.life -= p.decay;
        if (p.life <= 0) return;

        const alpha = p.life * 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 80, ${alpha})`;
        ctx.fill();

        // Tiny sparkle highlight
        if (p.life > 0.5 && p.size > 1.5) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
            ctx.fill();
        }

        alive.push(p);
    });
    return alive;
};

const TIMELINE_INTERVAL_MS = 12000;
const TIMELINE_MAX_POINTS = 12;

const drawTimeline = (ctx, timeline, nodes, canvasWidth, canvasHeight) => {
    if (timeline.length < 2) return;
    const h = 32;
    const y0 = canvasHeight - h - 10;
    const w = Math.min(canvasWidth * 0.55, 500);
    const x0 = (canvasWidth - w) / 2;

    // Background pill
    ctx.beginPath();
    roundRect(ctx, x0 - 12, y0 - 6, w + 24, h + 12, 10);
    ctx.fillStyle = 'rgba(4,4,15,0.55)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const colors = { 1: '#00F5FF', 2: '#00FF41', 3: '#FF00E5' };
    const nodeIds = [1, 2, 3];
    nodeIds.forEach(nid => {
        const color = colors[nid];
        const pts = timeline.map((snap, i) => {
            const nodeSnap = snap.nodes.find(n => n.id === nid);
            const r = nodeSnap?.radius ?? 70;
            return {
                x: x0 + (i / (timeline.length - 1)) * w,
                y: y0 + h - ((r - 30) / 90) * h,
            };
        });

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            const cp1x = (pts[i - 1].x + pts[i].x) / 2;
            ctx.bezierCurveTo(cp1x, pts[i - 1].y, cp1x, pts[i].y, pts[i].x, pts[i].y);
        }
        ctx.strokeStyle = hexToRgba(color, 0.55);
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Latest point dot
        const last = pts[pts.length - 1];
        ctx.beginPath();
        ctx.arc(last.x, last.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    });

    // "Journey" label
    ctx.font = `700 9px 'Outfit', sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    ctx.fillText('JOURNEY', x0 + w / 2, y0 + h + 16);
};

const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
};

const updateNodesPhysics = (nodes, draggingNode, canvasWidth, canvasHeight, minX, maxX) => {
    const lerpSpeed = 0.08;
    nodes.forEach(node => {
        if (Math.abs(node.radius - node.targetRadius) > 0.5) {
            node.radius = lerp(node.radius, node.targetRadius, lerpSpeed);
        } else {
            node.radius = node.targetRadius;
        }

        if (node.fluidity !== undefined && node.targetFluidity !== undefined) {
            if (Math.abs(node.fluidity - node.targetFluidity) > 0.01) {
                node.fluidity = lerp(node.fluidity, node.targetFluidity, lerpSpeed * 0.5);
            } else {
                node.fluidity = node.targetFluidity;
            }
        } else {
            node.fluidity = 0.5;
            node.targetFluidity = 0.5;
        }

        if (node.color !== node.targetColor) {
            node.color = lerpColor(node.color, node.targetColor, lerpSpeed * 2);
            if (lerpColor(node.color, node.targetColor, 0) === node.targetColor) {
                node.color = node.targetColor;
            }
        }
        if (node.pulse > 0) node.pulse -= 0.015;
        if (node.pulse < 0) node.pulse = 0;
        if (!draggingNode || draggingNode !== node.id) {
            node.x += node.velocity.x;
            node.y += node.velocity.y;
            if (node.x - node.radius < minX || node.x + node.radius > maxX) node.velocity.x *= -1;
            if (node.y - node.radius < 0 || node.y + node.radius > canvasHeight) node.velocity.y *= -1;
            node.x = Math.max(minX + node.radius, Math.min(maxX - node.radius, node.x));
            node.y = Math.max(node.radius, Math.min(canvasHeight - node.radius, node.y));
        }
    });
};


// ══════════════════════════════════════════════
// FEATURE 3: FLOWING LIGHT CONNECTIONS
// Each connection line has a glowing dot of light
// that travels from node to node continuously.
// ══════════════════════════════════════════════

const drawConnections = (ctx, nodes, dashOffsetRef, reducedMotion = false) => {
    const now = Date.now();

    if (!reducedMotion) {
        dashOffsetRef.current += 0.2;
    }

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];

            // ── ALIGNMENT GLOW — shows match/mismatch between circles
            // Compare radii similarity to determine alignment
            const radiusDiff = Math.abs(a.radius - b.radius);
            const maxR = Math.max(a.radius, b.radius, 1);
            const alignment = 1 - (radiusDiff / maxR); // 0=misaligned, 1=aligned
            // Green glow for aligned, red tint for misaligned
            const alignR = Math.round(lerp(255, 0, alignment));
            const alignG = Math.round(lerp(60, 200, alignment));
            const alignB = Math.round(lerp(60, 100, alignment));
            const alignAlpha = 0.08 + alignment * 0.12; // brighter when aligned

            const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            grad.addColorStop(0, `rgba(${alignR},${alignG},${alignB},${alignAlpha})`);
            grad.addColorStop(0.5, `rgba(${alignR},${alignG},${alignB},${alignAlpha * 1.3})`);
            grad.addColorStop(1, `rgba(${alignR},${alignG},${alignB},${alignAlpha})`);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 0.8 + alignment * 1.5; // thicker when aligned
            ctx.setLineDash(alignment < 0.3 ? [3, 6] : []); // dashed when misaligned
            ctx.stroke();

            if (reducedMotion) {
                continue;
            }

            // Flowing light dot — cycles 0→1 every 4s, per pair
            const cycleMs = 3500 + (i * 700 + j * 300);
            const t = ((now % cycleMs) / cycleMs);
            const lx = a.x + (b.x - a.x) * t;
            const ly = a.y + (b.y - a.y) * t;
            const lightColor = t < 0.5 ? a.color : b.color;
            const grd = ctx.createRadialGradient(lx, ly, 0, lx, ly, 10);
            grd.addColorStop(0, hexToRgba(lightColor, 0.9));
            grd.addColorStop(0.4, hexToRgba(lightColor, 0.4));
            grd.addColorStop(1, 'transparent');
            ctx.beginPath();
            ctx.arc(lx, ly, 10, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();
        }
    }
};


// ── SHAPE IDENTITY: Each circle has a unique shape that mirrors its meaning.
// أنت (id=1)  → organic blob (alive, imperfect, human)
// العلم (id=2) → hexagon (precise, crystalline, rational)
// الواقع (id=3) → diamond (solid, grounded, factual)

const drawBlob = (ctx, cx, cy, r, f, time) => {
    // Organic amoeba shape — exaggerated for id=1 "أنت"
    ctx.beginPath();
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        // Always has organic character (not just when fluidity>0.5)
        const baseWave = 0.18 + f * 0.22; // 0.18..0.40
        let wr = r;
        wr += Math.sin(theta * 5 + time * 0.0028) * r * baseWave;
        wr += Math.cos(theta * 3 - time * 0.0021) * r * 0.12;
        wr += Math.sin(theta * 7 + time * 0.0015) * r * 0.06;
        const x = cx + Math.cos(theta) * wr;
        const y = cy + Math.sin(theta) * wr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
};

const drawHexagon = (ctx, cx, cy, r, f, time) => {
    // Crystalline hexagon for id=2 "العلم" — can wobble slightly if fluidity is high
    ctx.beginPath();
    const sides = 6;
    for (let i = 0; i <= sides; i++) {
        const theta = (i / sides) * Math.PI * 2 - Math.PI / 6; // flat top
        let wr = r;
        if (f > 0.6) {
            // High fluidity: slightly wavy hex
            wr += Math.sin(theta * 3 + time * 0.002) * r * (f - 0.6) * 0.3;
        }
        const x = cx + Math.cos(theta) * wr;
        const y = cy + Math.sin(theta) * wr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
};

const drawDiamond = (ctx, cx, cy, r, f, time) => {
    // Diamond / rhombus for id=3 "الواقع" — solid when clear, shaky when unclear
    ctx.beginPath();
    const scale = f < 0.4 ? 1.0 : 1.0 - (f - 0.4) * 0.12; // compress vertically if uncertain
    const jitter = f > 0.6 ? Math.sin(time * 0.005) * r * (f - 0.6) * 0.12 : 0;
    ctx.moveTo(cx, cy - r * 1.08 + jitter);           // top
    ctx.lineTo(cx + r * 0.82, cy + jitter * 0.5);     // right
    ctx.lineTo(cx, cy + r * scale + jitter * 0.8);    // bottom
    ctx.lineTo(cx - r * 0.82, cy + jitter * 0.5);     // left
    ctx.closePath();
};

const drawNodeShape = (ctx, node, cx, cy, r, f, time) => {
    if (node.id === 1) return drawBlob(ctx, cx, cy, r, f, time);
    if (node.id === 2) return drawHexagon(ctx, cx, cy, r, f, time);
    if (node.id === 3) return drawDiamond(ctx, cx, cy, r, f, time);
    // Fallback: original dynamic shape
    return drawDynamicShape(ctx, cx, cy, r, f, time);
};

const drawDynamicShape = (ctx, cx, cy, r, f, time) => {
    ctx.beginPath();
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        let wr = r;
        if (f > 0.5) {
            const wave = (f - 0.5) * 2;
            wr += Math.sin(theta * 6 + time * 0.003) * 12 * wave;
            wr += Math.cos(theta * 4 - time * 0.002) * 8 * wave;
        } else if (f < 0.5) {
            const rigidity = (0.5 - f) * 2;
            const cos = Math.cos(theta);
            const sin = Math.sin(theta);
            const maxCosSin = Math.max(Math.abs(cos), Math.abs(sin));
            const squircleR = r / (Math.pow(maxCosSin, 0.45));
            wr = lerp(r, squircleR * 0.85, rigidity);
        }
        const x = cx + Math.cos(theta) * wr;
        const y = cy + Math.sin(theta) * wr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
};


// ══════════════════════════════════════════════════
// NEURAL NETWORK TEXTURE — Internal Pathways
// Each circle shows an internal network of lines
// representing the "pathways" of thought/perception.
// أنت: dense, organic, tangled (learned patterns)
// العلم: ordered, geometric grid (structured knowledge)
// الواقع: few strong lines (hard facts)
// ══════════════════════════════════════════════════

const drawNeuralNetwork = (ctx, node, cx, cy, r, f, time) => {
    if (r < 30) return; // too small to show detail

    ctx.save();
    ctx.beginPath();
    // Clip to the circle shape so network stays inside
    ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
    ctx.clip();

    const innerR = r * 0.75;

    if (node.id === 1) {
        // ── أنت: ORGANIC TANGLED NETWORK ─────────────────
        // Dense, slightly chaotic — represents learned patterns,
        // childhood wiring, emotional habits
        const density = 6 + Math.floor(f * 6); // 6-12 paths
        const nodePoints = [];

        for (let i = 0; i < density; i++) {
            const angle = (i / density) * Math.PI * 2 + time * 0.0003;
            const dist = innerR * (0.2 + Math.random() * 0.6);
            const wobble = Math.sin(time * 0.002 + i * 1.3) * innerR * f * 0.15;
            nodePoints.push({
                x: cx + Math.cos(angle) * dist + wobble,
                y: cy + Math.sin(angle) * dist + wobble * 0.7,
            });
        }

        // Draw connections between nearby points
        const opacity = 0.12 + f * 0.08;
        ctx.strokeStyle = hexToRgba(node.color, opacity);
        ctx.lineWidth = 0.8;

        for (let i = 0; i < nodePoints.length; i++) {
            for (let j = i + 1; j < nodePoints.length; j++) {
                const dx = nodePoints[i].x - nodePoints[j].x;
                const dy = nodePoints[i].y - nodePoints[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < innerR * 0.8) {
                    ctx.beginPath();
                    // Curved lines for organic feel
                    const midX = (nodePoints[i].x + nodePoints[j].x) / 2 +
                                 Math.sin(time * 0.001 + i) * 8 * f;
                    const midY = (nodePoints[i].y + nodePoints[j].y) / 2 +
                                 Math.cos(time * 0.001 + j) * 8 * f;
                    ctx.moveTo(nodePoints[i].x, nodePoints[i].y);
                    ctx.quadraticCurveTo(midX, midY, nodePoints[j].x, nodePoints[j].y);
                    ctx.stroke();
                }
            }
        }

        // Tiny neuron dots at intersection points
        nodePoints.forEach((p, i) => {
            const dotPulse = 0.5 + Math.sin(time * 0.004 + i * 0.8) * 0.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.5 + dotPulse, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(node.color, 0.2 + dotPulse * 0.15);
            ctx.fill();
        });

    } else if (node.id === 2) {
        // ── العلم: GEOMETRIC GRID NETWORK ────────────────
        // Ordered, structured, hexagonal — represents proven knowledge
        const gridSize = Math.max(18, 24 - f * 10); // tighter when stable
        const opacity = 0.08 + (1 - f) * 0.06; // more visible when low fluidity

        ctx.strokeStyle = hexToRgba(node.color, opacity);
        ctx.lineWidth = 0.6;

        // Horizontal lines
        for (let y = cy - innerR; y < cy + innerR; y += gridSize) {
            const dx = Math.sqrt(Math.max(0, innerR * innerR - (y - cy) * (y - cy)));
            ctx.beginPath();
            ctx.moveTo(cx - dx, y);
            ctx.lineTo(cx + dx, y);
            ctx.stroke();
        }

        // Diagonal lines (hex-like pattern)
        for (let x = cx - innerR; x < cx + innerR; x += gridSize) {
            const dy = Math.sqrt(Math.max(0, innerR * innerR - (x - cx) * (x - cx)));
            ctx.beginPath();
            ctx.moveTo(x, cy - dy);
            ctx.lineTo(x + gridSize * 0.5, cy + dy);
            ctx.stroke();
        }

        // Knowledge nodes at intersections
        for (let y = cy - innerR; y < cy + innerR; y += gridSize) {
            for (let x = cx - innerR; x < cx + innerR; x += gridSize) {
                const dx = x - cx;
                const dy2 = y - cy;
                if (dx * dx + dy2 * dy2 < innerR * innerR * 0.7) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
                    ctx.fillStyle = hexToRgba(node.color, opacity * 1.5);
                    ctx.fill();
                }
            }
        }

    } else if (node.id === 3) {
        // ── الواقع: FEW STRONG LINES ────────────────────
        // Minimal, bold, definite — represents hard facts
        const lineCount = 3 + Math.floor((1 - f) * 3); // 3-6 lines (more when stable)
        const opacity = 0.10 + (1 - f) * 0.10; // stronger when certain

        ctx.strokeStyle = hexToRgba(node.color, opacity);
        ctx.lineWidth = 1.5 + (1 - f) * 1; // thicker when f is low (certain)
        ctx.lineCap = 'round';

        for (let i = 0; i < lineCount; i++) {
            const angle = (i / lineCount) * Math.PI + time * 0.0001;
            const len = innerR * (0.5 + (1 - f) * 0.3);
            ctx.beginPath();
            ctx.moveTo(
                cx + Math.cos(angle) * len * 0.2,
                cy + Math.sin(angle) * len * 0.2
            );
            ctx.lineTo(
                cx + Math.cos(angle) * len,
                cy + Math.sin(angle) * len
            );
            ctx.stroke();

            // Strong endpoint dot — "fact anchor"
            ctx.beginPath();
            ctx.arc(
                cx + Math.cos(angle) * len,
                cy + Math.sin(angle) * len,
                2 + (1 - f) * 1.5, 0, Math.PI * 2
            );
            ctx.fillStyle = hexToRgba(node.color, opacity * 1.3);
            ctx.fill();
        }

        // Central anchor point
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(node.color, opacity * 1.5);
        ctx.fill();
    }

    ctx.restore();
};

const drawNodes = (ctx, nodes, now, reducedMotion = false) => {
    nodes.forEach(node => {
        const currentRadius = node.radius + (reducedMotion ? 0 : node.pulse * 20);
        const f = node.fluidity ?? 0.5;
        const drawTime = reducedMotion ? 0 : now;

        // Pulse ring — uses the per-id shape
        if (!reducedMotion && node.pulse > 0.1) {
            drawNodeShape(ctx, node, node.x, node.y, currentRadius + (node.pulse * 30), f, drawTime);
            ctx.strokeStyle = hexToRgba(node.color, node.pulse * 0.75);
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Outer glow — identity shape
        drawNodeShape(ctx, node, node.x, node.y, currentRadius + 6, f, drawTime);
        ctx.fillStyle = hexToRgba(node.color, 0.15);
        ctx.fill();

        // Main fill — identity shape
        drawNodeShape(ctx, node, node.x, node.y, currentRadius, f, drawTime);
        ctx.fillStyle = hexToRgba(node.color, 0.6);
        ctx.fill();

        // ── NEURAL NETWORK TEXTURE — internal pathways ──────
        if (!reducedMotion && currentRadius > 35) {
            drawNeuralNetwork(ctx, node, node.x, node.y, currentRadius, f, drawTime);
        }

        // Inner edge stroke for crispness
        drawNodeShape(ctx, node, node.x, node.y, currentRadius, f, drawTime);
        ctx.strokeStyle = hexToRgba(node.color, 0.85);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Highlight dot (shifted per shape for better feel)
        const hlOffset = node.id === 3 ? 0.25 : 0.33; // diamond: more centered
        ctx.beginPath();
        ctx.arc(node.x - currentRadius * hlOffset, node.y - currentRadius * hlOffset,
                currentRadius / 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();

        // Main label
        const labelSize = Math.floor(currentRadius / 3.5);
        ctx.fillStyle = '#FFF';
        ctx.font = `700 ${labelSize}px 'Outfit', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const yOffset = node.subtitle ? -labelSize * 0.55 : 0;
        ctx.fillText(node.label, node.x, node.y + yOffset);

        // Subtitle
        if (node.subtitle && currentRadius > 40) {
            const subtitleSize = Math.max(9, Math.floor(labelSize * 0.55));
            ctx.font = `400 ${subtitleSize}px 'Outfit', sans-serif`;
            ctx.fillStyle = hexToRgba('#ffffff', 0.65);
            ctx.fillText(node.subtitle, node.x, node.y + yOffset + labelSize * 1.1);
        }
    });
};

const DawayirCanvas = memo(forwardRef((props, ref) => {
    const PANEL_WIDTH = 380;
    const TARGET_FPS = 20;
    const MOBILE_FPS = 16; // Lower FPS target on mobile devices
    const effectiveFPS = typeof window !== 'undefined' && window.innerWidth < 768 ? MOBILE_FPS : TARGET_FPS;
    const DEBUG_CANVAS = false;
    const paletteRef = useRef({
        background: '#04040f',
        awareness: '#00F5FF',
        knowledge: '#00FF41',
        truth: '#FF00E5',
    });
    const canvasRef = useRef(null);
    const isAr = props.lang === 'ar';
    const initPanelW = typeof window !== 'undefined' && window.innerWidth > 768 ? PANEL_WIDTH : 0;
    const initW = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const initH = typeof window !== 'undefined' ? window.innerHeight : 768;
    const initMinX = isAr ? 0 : initPanelW;
    const initMaxX = isAr ? initW - initPanelW : initW;
    const initRange = initMaxX - initMinX;

    const nodesRef = useRef([
        { id: 1, x: initMinX + initRange * 0.25, y: initH / 2, radius: 70, targetRadius: 70, color: '#00F5FF', targetColor: '#00F5FF', label: isAr ? 'أنت' : 'You', subtitle: isAr ? 'إدراكك' : 'your perception', pulse: 0, velocity: { x: 0.2, y: 0.1 }, fluidity: 0.6, targetFluidity: 0.6 },
        { id: 2, x: initMinX + initRange * 0.5, y: initH / 2, radius: 85, targetRadius: 85, color: '#00FF41', targetColor: '#00FF41', label: isAr ? 'العلم' : 'Science', subtitle: isAr ? 'ما وصل له العلم' : 'what science knows', pulse: 0, velocity: { x: -0.15, y: 0.25 }, fluidity: 0.2, targetFluidity: 0.2 },
        { id: 3, x: initMinX + initRange * 0.75, y: initH / 2, radius: 95, targetRadius: 95, color: '#FF00E5', targetColor: '#FF00E5', label: isAr ? 'الواقع' : 'Reality', subtitle: isAr ? 'ما هو موجود فعلاً' : 'what actually is', pulse: 0, velocity: { x: 0.1, y: -0.2 }, fluidity: 0.15, targetFluidity: 0.15 },
    ]);
    const satellitesRef = useRef([]);          // live orbital topic nodes
    const timelineRef = useRef([]);             // session state snapshots
    const lastTimelineSnapRef = useRef(0);      // timestamp of last timeline snapshot
    // Add voice-breathing amplitude support + clarity bloom refs
    const voiceAmplitudeRef = useRef(0);    // 0..1, updated externally
    const bloomRef = useRef(null);           // { startTime } or null
    const agentSpeakingRef = useRef(false);   // true when Dawayir is speaking
    const orbParticlesRef = useRef([]);       // Divine Orb gold particles
    const otherNodeRef = useRef(null);        // The "Other Person" circle
    const prevTruthRadiusRef = useRef(95);   // track Truth node for bloom trigger
    const particlesRef = useRef([]);
    const dashOffsetRef = useRef(0);
    const lastFrameTimeRef = useRef(0);
    const [draggingNode, setDraggingNode] = useState(null);


    useEffect(() => {
        const awareness = getCssVar('--ds-circle-awareness', '#00F5FF');
        const knowledge = getCssVar('--ds-circle-knowledge', '#00FF41');
        const truth = getCssVar('--ds-circle-truth', '#FF00E5');
        paletteRef.current = {
            background: getCssVar('--ds-bg-deep', '#04040f'),
            awareness,
            knowledge,
            truth,
        };
        nodesRef.current = nodesRef.current.map((node) => {
            if (node.id === 1) return { ...node, color: awareness, targetColor: awareness };
            if (node.id === 2) return { ...node, color: knowledge, targetColor: knowledge };
            if (node.id === 3) return { ...node, color: truth, targetColor: truth };
            return node;
        });

        const particles = [];
        if (!props.reducedMotion) {
            const isMobile = window.innerWidth < 768;
        for (let i = 0; i < (isMobile ? 8 : 20); i++) {
                particles.push({
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    size: Math.random() * 2 + 0.5,
                    opacity: Math.random() * 0.3 + 0.1,
                    speedX: (Math.random() - 0.5) * 0.3,
                    speedY: (Math.random() - 0.5) * 0.3
                });
            }
        }
        particlesRef.current = particles;
    }, [props.reducedMotion]);

    useImperativeHandle(ref, () => ({
        updateNode: (id, updates) => {
            if (DEBUG_CANVAS) {
                console.log(`[Canvas] updateNode called: id=${id}, updates=`, updates);
            }
            const node = nodesRef.current.find(n => n.id === id);
            if (!node) return;
            if (updates.radius !== undefined) node.targetRadius = Number(updates.radius);
            if (updates.color !== undefined) node.targetColor = String(updates.color);
            if (updates.label !== undefined) node.label = updates.label;
            if (updates.x !== undefined) node.x = updates.x;
            if (updates.y !== undefined) node.y = updates.y;
            if (updates.fluidity !== undefined) node.targetFluidity = Number(updates.fluidity);
            if (props.reducedMotion) {
                if (updates.radius !== undefined) node.radius = Number(updates.radius);
                if (updates.color !== undefined) node.color = String(updates.color);
                if (updates.fluidity !== undefined) node.fluidity = Number(updates.fluidity);
                node.pulse = 0;
            }
        },
        pulseNode: (id) => {
            if (props.reducedMotion) return;
            nodesRef.current = nodesRef.current.map(node =>
                node.id === id ? { ...node, pulse: 1.0 } : node
            );
        },
        pulseAll: () => {
            if (props.reducedMotion) return;
            nodesRef.current = nodesRef.current.map(node => ({ ...node, pulse: 0.8 }));
        },
        getNodes: () => nodesRef.current.map(n => ({ id: n.id, x: n.x, y: n.y, radius: n.radius, color: n.color, label: n.label })),
        // ── ACCESSIBILITY ──────────────────────────────────────
        getAccessibleDescription: () => {
            const nodes = nodesRef.current;
            if (!nodes || nodes.length === 0) return '';
            const descriptions = nodes.map(n => {
                const size = n.radius > 80 ? 'large' : n.radius > 50 ? 'medium' : 'small';
                return `${n.label}: ${size}`;
            });
            return descriptions.join(', ');
        },

        // ── SATELLITE NODES ──────────────────────────────
        // Spawn a small topic node orbiting the parent circle.
        // nodeId: 1=Awareness 2=Knowledge 3=Truth
        // label: short topic word (max ~6 chars for best display)
        addSatellite: (nodeId, label) => {
            if (props.reducedMotion) return;
            const now = Date.now();
            const current = satellitesRef.current.filter(s => now - s.createdAt < SATELLITE_LIFETIME_MS);
            // Max 2 per parent
            const forThisNode = current.filter(s => s.parentId === nodeId);
            if (forThisNode.length >= MAX_SATELLITES_PER_NODE) {
                // Remove oldest one to make room
                const oldest = forThisNode.reduce((a, b) => a.createdAt < b.createdAt ? a : b);
                satellitesRef.current = current.filter(s => s !== oldest);
            } else {
                satellitesRef.current = current;
            }
            const parent = nodesRef.current.find(n => n.id === nodeId);
            const startAngle = Math.random() * Math.PI * 2;
            satellitesRef.current.push({
                id: `${nodeId}-${now}-${Math.random().toString(36).slice(2)}`,
                parentId: nodeId,
                label: label.slice(0, 7),
                x: (parent?.x ?? 200) + 80,
                y: (parent?.y ?? 200),
                radius: Math.min(14 + label.length * 1.2, 22),
                orbitAngle: startAngle,
                orbitOffset: Math.random() * 15,
                orbitSpeed: 0.004 + Math.random() * 0.006,
                createdAt: now,
            });
        },

        // ── FEATURE 5: VOICE BREATHING ──────────────────────────
        // Expose setVoiceAmplitude for App.jsx to call with mic level
        setVoiceAmplitude: (amp) => {
            voiceAmplitudeRef.current = props.reducedMotion ? 0 : Math.max(0, Math.min(1, amp));
        },

        // ── CLARITY BLOOM (manual trigger) ──────────────────────
        triggerBloom: () => {
            if (props.reducedMotion) return;
            bloomRef.current = { startTime: Date.now() };
        },

        // ── TIMELINE ─────────────────────────────────────────────
        getTimeline: () => timelineRef.current,
        // ── MEMORY REPLAY ──────────────────────────────────────
        replayTimeline: (snapshots, onFrame) => {
            if (!snapshots || snapshots.length < 2) return;
            let frame = 0;
            const interval = setInterval(() => {
                if (frame >= snapshots.length) { clearInterval(interval); return; }
                const snap = snapshots[frame];
                snap.nodes.forEach(ns => {
                    const node = nodesRef.current.find(n => n.id === ns.id);
                    if (node) node.targetRadius = ns.radius;
                });
                if (onFrame) onFrame(frame, snapshots.length);
                frame++;
            }, 800); // 800ms per frame
            return () => clearInterval(interval); // cleanup
        },
        clearSatellites: () => { satellitesRef.current = []; },

        // ── DIVINE VOICE ORB ─────────────────────────────────────
        setAgentSpeaking: (speaking) => {
            agentSpeakingRef.current = Boolean(speaking);
        },

        // ── THE OTHER PERSON CIRCLE ─────────────────────────────
        setOtherNode: (name, tension, color) => {
            const selfNode = nodesRef.current.find(n => n.id === 1);
            const cx = selfNode ? selfNode.x + selfNode.radius * 2.2 : 300;
            const cy = selfNode ? selfNode.y - 40 : 200;
            otherNodeRef.current = {
                name: String(name).slice(0, 8),
                tension: Math.max(0, Math.min(1, Number(tension) || 0.5)),
                color: String(color || '#FFD700'),
                x: cx,
                y: cy,
                radius: 0,       // starts at 0, animates in
                targetRadius: 38,
                opacity: 0,
                targetOpacity: 1,
                born: Date.now(),
                lastMentioned: Date.now(),
            };
        },
        dismissOther: () => {
            if (otherNodeRef.current) {
                otherNodeRef.current.targetRadius = 0;
                otherNodeRef.current.targetOpacity = 0;
            }
        },
    }));

    useEffect(() => {

        const handleResize = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const oldW = canvas.width;
            const oldH = canvas.height;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const scaleX = canvas.width / (oldW || canvas.width);
            const scaleY = canvas.height / (oldH || canvas.height);
            nodesRef.current.forEach(node => { node.x *= scaleX; node.y *= scaleY; });
            particlesRef.current.forEach(p => { p.x *= scaleX; p.y *= scaleY; });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const render = (timestamp) => {
            const frameInterval = 1000 / effectiveFPS;
            if (timestamp - lastFrameTimeRef.current < frameInterval) {
                animationFrameId = window.requestAnimationFrame(render);
                return;
            }
            lastFrameTimeRef.current = timestamp;

            const currentNodes = nodesRef.current;
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;

            const isAr = props.lang === 'ar';
            const currentPanelWidth = canvasWidth > 768 ? PANEL_WIDTH : 0;
            const minX = isAr ? 0 : currentPanelWidth;
            const maxX = isAr ? canvasWidth - currentPanelWidth : canvasWidth;

            const now = Date.now();
            const reducedMotion = Boolean(props.reducedMotion);

            drawBackground(ctx, canvasWidth, canvasHeight, paletteRef.current.background, currentNodes);
            if (!reducedMotion) {
                drawParticles(ctx, particlesRef.current, canvasWidth, canvasHeight, currentNodes);
            }

            // ── FEATURE 5: VOICE BREATHING ──────────────────────────
            // Circles gently swell with voice amplitude — living biofeedback
            const amp = reducedMotion ? 0 : voiceAmplitudeRef.current;
            if (amp > 0.05) {
                currentNodes.forEach(node => {
                    const breathe = amp * 12; // max +12px
                    node.targetRadius = Math.max(node.targetRadius, Math.min(120, node.targetRadius + breathe * 0.02));
                });
            }

            if (reducedMotion) {
                currentNodes.forEach((node) => {
                    node.radius = node.targetRadius;
                    node.color = node.targetColor;
                    node.fluidity = node.targetFluidity;
                    node.pulse = 0;
                });
            } else {
                updateNodesPhysics(currentNodes, draggingNode, canvasWidth, canvasHeight, minX, maxX);
            }
            drawConnections(ctx, currentNodes, dashOffsetRef, reducedMotion);
            drawNodes(ctx, currentNodes, now, reducedMotion);

            // ── THE OTHER PERSON CIRCLE ────────────────────────────
            if (otherNodeRef.current) {
                const selfNode = currentNodes.find(n => n.id === 1);
                const result = drawOtherNode(ctx, otherNodeRef.current, selfNode, now);
                if (!result) otherNodeRef.current = null; // fully faded
            }

            // ── DIVINE VOICE ORB — drawn on top of circles ──────────
            if (!reducedMotion && agentSpeakingRef.current) {
                const orbAmp = voiceAmplitudeRef.current;
                const cx = canvasWidth / 2;
                const cy = canvasHeight * 0.42;
                drawDivineOrb(ctx, canvasWidth, canvasHeight, currentNodes, orbAmp, now);
                orbParticlesRef.current = spawnOrbParticles(orbParticlesRef.current, cx, cy, now);
                orbParticlesRef.current = updateOrbParticles(ctx, orbParticlesRef.current, now);
            } else if (orbParticlesRef.current.length > 0) {
                // Fade out remaining particles after speech stops
                orbParticlesRef.current = updateOrbParticles(ctx, orbParticlesRef.current, now);
            }

            // Draw satellite topic nodes
            if (!reducedMotion) {
                satellitesRef.current = updateSatellites(satellitesRef.current, currentNodes, now);
                drawSatellites(ctx, satellitesRef.current, currentNodes, now);
            }

            // Record timeline snapshot every TIMELINE_INTERVAL_MS
            if (now - lastTimelineSnapRef.current > TIMELINE_INTERVAL_MS) {
                lastTimelineSnapRef.current = now;
                const snap = {
                    t: now,
                    nodes: currentNodes.map(n => ({ id: n.id, radius: Math.round(n.radius) })),
                };
                timelineRef.current = [...timelineRef.current.slice(-TIMELINE_MAX_POINTS + 1), snap];
            }

            // Draw session journey timeline
            drawTimeline(ctx, timelineRef.current, currentNodes, canvasWidth, canvasHeight);

            // ── FEATURE 4: CLARITY BLOOM ─────────────────────────────
            // When Truth circle (id=3) grows large, trigger a spectacular
            // radial bloom that radiates from it and gently fades.
            const truthNode = currentNodes.find(n => n.id === 3);
            if (truthNode) {
                if (truthNode.radius > 105 && prevTruthRadiusRef.current <= 105 && !bloomRef.current) {
                    bloomRef.current = { startTime: now };
                }
                prevTruthRadiusRef.current = truthNode.radius;
            }

            if (!reducedMotion && bloomRef.current) {
                const elapsed = now - bloomRef.current.startTime;
                const bloomDuration = 2200;
                if (elapsed < bloomDuration && truthNode) {
                    const progress = elapsed / bloomDuration;
                    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                    const bloomR = eased * Math.min(canvasWidth, canvasHeight) * 0.8;
                    const opacity = (1 - eased) * 0.18;

                    // Outer ring
                    const bloomGrd = ctx.createRadialGradient(
                        truthNode.x, truthNode.y, bloomR * 0.3,
                        truthNode.x, truthNode.y, bloomR
                    );
                    bloomGrd.addColorStop(0, `rgba(255,0,229,0)`);
                    bloomGrd.addColorStop(0.6, `rgba(255,0,229,${opacity})`);
                    bloomGrd.addColorStop(1, `rgba(255,0,229,0)`);
                    ctx.beginPath();
                    ctx.arc(truthNode.x, truthNode.y, bloomR, 0, Math.PI * 2);
                    ctx.fillStyle = bloomGrd;
                    ctx.fill();

                    // Shockwave ring
                    ctx.beginPath();
                    ctx.arc(truthNode.x, truthNode.y, bloomR * 0.95, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255,0,229,${opacity * 1.8})`;
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    if (progress > 0.98) bloomRef.current = null;
                } else if (elapsed >= bloomDuration) {
                    bloomRef.current = null;
                }
            }


            animationFrameId = window.requestAnimationFrame(render);
        };

        render();
        return () => window.cancelAnimationFrame(animationFrameId);
    }, [draggingNode, PANEL_WIDTH, props.lang, props.reducedMotion]);

    const handleMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const clickedNode = nodesRef.current.find(node => {
            const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
            return distance < node.radius;
        });
        if (clickedNode) setDraggingNode(clickedNode.id);
    };

    const handleMouseMove = (e) => {
        if (!draggingNode) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        nodesRef.current = nodesRef.current.map(node =>
            node.id === draggingNode ? { ...node, x, y } : node
        );
    };

    const handleMouseUp = () => setDraggingNode(null);

    const handleTouchStart = (e) => {
        const touch = e.touches?.[0];
        if (!touch) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const touchedNode = nodesRef.current.find(node => {
            const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
            return distance < node.radius;
        });
        if (touchedNode) setDraggingNode(touchedNode.id);
    };

    const handleTouchMove = (e) => {
        if (!draggingNode) return;
        const touch = e.touches?.[0];
        if (!touch) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        nodesRef.current = nodesRef.current.map(node =>
            node.id === draggingNode ? { ...node, x, y } : node
        );
    };

    const handleTouchEnd = () => setDraggingNode(null);

    return (
        <canvas
            ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
            role="img"
            aria-label={props.lang === 'ar'
                ? 'خريطة دوائر الذهنية بثلاث دوائر: الوعي والعلم والحقيقة'
                : 'Dawayir mental map with three circles: awareness, knowledge, and truth'}
            tabIndex={0}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ display: 'block' }}
        />
    );
}));

export default DawayirCanvas;

