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

const drawBackground = (ctx, canvasWidth, canvasHeight, color, nodes) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (!nodes || nodes.length === 0) return;

    // Find dominant node (largest radius)
    const dominant = nodes.reduce((a, b) => a.radius > b.radius ? a : b);
    const dominantColor = dominant.color;
    const intensity = Math.min(0.06, (dominant.radius - 60) / 1200); // max 6% opacity

    // Full-screen aura from dominant node position
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

const drawConnections = (ctx, nodes, dashOffsetRef) => {
    const now = Date.now();

    dashOffsetRef.current += 0.2;

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];

            // Base connection line (slim, elegant)
            const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            grad.addColorStop(0, hexToRgba(a.color, 0.12));
            grad.addColorStop(1, hexToRgba(b.color, 0.12));
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            ctx.stroke();

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


const drawDynamicShape = (ctx, cx, cy, r, f, time) => {
    ctx.beginPath();
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        let wr = r;
        if (f > 0.5) {
            // Wavy / Fluid
            const wave = (f - 0.5) * 2; // 0 to 1
            wr += Math.sin(theta * 6 + time * 0.003) * 12 * wave;
            wr += Math.cos(theta * 4 - time * 0.002) * 8 * wave;
        } else if (f < 0.5) {
            // Stable / Squircle
            const rigidity = (0.5 - f) * 2; // 0 to 1
            const cos = Math.cos(theta);
            const sin = Math.sin(theta);
            const maxCosSin = Math.max(Math.abs(cos), Math.abs(sin));
            const squircleR = r / (Math.pow(maxCosSin, 0.45));
            wr = lerp(r, squircleR * 0.85, rigidity);
        }

        const x = cx + Math.cos(theta) * wr;
        const y = cy + Math.sin(theta) * wr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
};

const drawNodes = (ctx, nodes, now) => {
    nodes.forEach(node => {
        const currentRadius = node.radius + (node.pulse * 20);
        const f = node.fluidity ?? 0.5;

        // Pulse ring
        if (node.pulse > 0.1) {
            drawDynamicShape(ctx, node.x, node.y, currentRadius + (node.pulse * 30), f, now);
            ctx.strokeStyle = hexToRgba(node.color, node.pulse * 0.75);
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Outer glow circle
        drawDynamicShape(ctx, node.x, node.y, currentRadius + 6, f, now);
        ctx.fillStyle = hexToRgba(node.color, 0.15);
        ctx.fill();

        // Main circle
        drawDynamicShape(ctx, node.x, node.y, currentRadius, f, now);
        ctx.fillStyle = hexToRgba(node.color, 0.6);
        ctx.fill();

        // Highlight dot
        ctx.beginPath();
        ctx.arc(node.x - currentRadius / 3, node.y - currentRadius / 3, currentRadius / 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();

        // Main label
        const labelSize = Math.floor(currentRadius / 3.5);
        ctx.fillStyle = '#FFF';
        ctx.font = `600 ${labelSize}px 'Outfit', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // If there's a subtitle, shift label up slightly so both fit
        const yOffset = node.subtitle ? -labelSize * 0.55 : 0;
        ctx.fillText(node.label, node.x, node.y + yOffset);

        // Subtitle — plain language explanation
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
        { id: 1, x: initMinX + initRange * 0.25, y: initH / 2, radius: 70, targetRadius: 70, color: '#00F5FF', targetColor: '#00F5FF', label: isAr ? 'الوعي' : 'Awareness', subtitle: isAr ? 'مشاعرك' : 'feelings', pulse: 0, velocity: { x: 0.2, y: 0.1 }, fluidity: 0.5, targetFluidity: 0.5 },
        { id: 2, x: initMinX + initRange * 0.5, y: initH / 2, radius: 85, targetRadius: 85, color: '#00FF41', targetColor: '#00FF41', label: isAr ? 'العلم' : 'Knowledge', subtitle: isAr ? 'تفكيرك' : 'thinking', pulse: 0, velocity: { x: -0.15, y: 0.25 }, fluidity: 0.5, targetFluidity: 0.5 },
        { id: 3, x: initMinX + initRange * 0.75, y: initH / 2, radius: 95, targetRadius: 95, color: '#FF00E5', targetColor: '#FF00E5', label: isAr ? 'الحقيقة' : 'Truth', subtitle: isAr ? 'قرارك' : 'decision', pulse: 0, velocity: { x: 0.1, y: -0.2 }, fluidity: 0.5, targetFluidity: 0.5 },
    ]);
    const satellitesRef = useRef([]);          // live orbital topic nodes
    const timelineRef = useRef([]);             // session state snapshots
    const lastTimelineSnapRef = useRef(0);      // timestamp of last timeline snapshot
    // Add voice-breathing amplitude support + clarity bloom refs
    const voiceAmplitudeRef = useRef(0);    // 0..1, updated externally
    const bloomRef = useRef(null);           // { startTime } or null
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
        for (let i = 0; i < 20; i++) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.3 + 0.1,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3
            });
        }
        particlesRef.current = particles;
    }, []);

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
        },
        pulseNode: (id) => {
            nodesRef.current = nodesRef.current.map(node =>
                node.id === id ? { ...node, pulse: 1.0 } : node
            );
        },
        pulseAll: () => {
            nodesRef.current = nodesRef.current.map(node => ({ ...node, pulse: 0.8 }));
        },
        getNodes: () => nodesRef.current.map(n => ({ id: n.id, x: n.x, y: n.y, radius: n.radius, color: n.color, label: n.label })),

        // ── SATELLITE NODES ──────────────────────────────
        // Spawn a small topic node orbiting the parent circle.
        // nodeId: 1=Awareness 2=Knowledge 3=Truth
        // label: short topic word (max ~6 chars for best display)
        addSatellite: (nodeId, label) => {
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
            voiceAmplitudeRef.current = Math.max(0, Math.min(1, amp));
        },

        // ── CLARITY BLOOM (manual trigger) ──────────────────────
        triggerBloom: () => {
            bloomRef.current = { startTime: Date.now() };
        },

        // ── TIMELINE ─────────────────────────────────────────────
        getTimeline: () => timelineRef.current,
        clearSatellites: () => { satellitesRef.current = []; },
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
            const frameInterval = 1000 / TARGET_FPS;
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

            drawBackground(ctx, canvasWidth, canvasHeight, paletteRef.current.background, currentNodes);
            drawParticles(ctx, particlesRef.current, canvasWidth, canvasHeight, currentNodes);

            // ── FEATURE 5: VOICE BREATHING ──────────────────────────
            // Circles gently swell with voice amplitude — living biofeedback
            const amp = voiceAmplitudeRef.current;
            if (amp > 0.05) {
                currentNodes.forEach(node => {
                    const breathe = amp * 12; // max +12px
                    node.targetRadius = Math.max(node.targetRadius, Math.min(120, node.targetRadius + breathe * 0.02));
                });
            }

            updateNodesPhysics(currentNodes, draggingNode, canvasWidth, canvasHeight, minX, maxX);
            drawConnections(ctx, currentNodes, dashOffsetRef);
            drawNodes(ctx, currentNodes, now);

            // Draw satellite topic nodes
            satellitesRef.current = updateSatellites(satellitesRef.current, currentNodes, now);
            drawSatellites(ctx, satellitesRef.current, currentNodes, now);

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

            if (bloomRef.current) {
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
    }, [draggingNode, PANEL_WIDTH]);

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

