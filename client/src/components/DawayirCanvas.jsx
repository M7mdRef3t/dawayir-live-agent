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

const drawBackground = (ctx, canvasWidth, canvasHeight) => {
    ctx.fillStyle = '#080812';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
};

const drawParticles = (ctx, particles, canvasWidth, canvasHeight) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = canvasWidth;
        if (p.x > canvasWidth) p.x = 0;
        if (p.y < 0) p.y = canvasHeight;
        if (p.y > canvasHeight) p.y = 0;
        ctx.globalAlpha = p.opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
};

const updateNodesPhysics = (nodes, draggingNode, canvasWidth, canvasHeight, panelWidth) => {
    const lerpSpeed = 0.06;
    nodes.forEach(node => {
        if (Math.abs(node.radius - node.targetRadius) > 0.5) {
            node.radius = lerp(node.radius, node.targetRadius, lerpSpeed);
        } else {
            node.radius = node.targetRadius;
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
            if (node.x - node.radius < panelWidth || node.x + node.radius > canvasWidth) node.velocity.x *= -1;
            if (node.y - node.radius < 0 || node.y + node.radius > canvasHeight) node.velocity.y *= -1;
            node.x = Math.max(panelWidth + node.radius, Math.min(canvasWidth - node.radius, node.x));
            node.y = Math.max(node.radius, Math.min(canvasHeight - node.radius, node.y));
        }
    });
};

const drawConnections = (ctx, nodes, dashOffsetRef) => {
    dashOffsetRef.current += 0.2;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -dashOffsetRef.current;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
        }
    }
    ctx.setLineDash([]);
};

const drawNodes = (ctx, nodes) => {
    nodes.forEach(node => {
        const currentRadius = node.radius + (node.pulse * 20);

        // Pulse ring
        if (node.pulse > 0.1) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, currentRadius + 10, 0, Math.PI * 2);
            ctx.strokeStyle = hexToRgba(node.color, node.pulse * 0.5);
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Outer glow circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius + 6, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(node.color, 0.15);
        ctx.fill();

        // Main circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(node.color, 0.6);
        ctx.fill();

        // Highlight dot
        ctx.beginPath();
        ctx.arc(node.x - currentRadius / 3, node.y - currentRadius / 3, currentRadius / 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();

        // Label
        ctx.fillStyle = '#FFF';
        ctx.font = `600 ${Math.floor(currentRadius / 3.5)}px 'Outfit', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, node.x, node.y);
    });
};

const DawayirCanvas = memo(forwardRef((props, ref) => {
    const PANEL_WIDTH = 380;
    const TARGET_FPS = 12;
    const DEBUG_CANVAS = false;
    const canvasRef = useRef(null);
    const nodesRef = useRef([
        { id: 1, x: PANEL_WIDTH + (window.innerWidth - PANEL_WIDTH) * 0.25, y: window.innerHeight / 2, radius: 70, targetRadius: 70, color: '#00F5FF', targetColor: '#00F5FF', label: 'Awareness', pulse: 0, velocity: { x: 0.2, y: 0.1 } },
        { id: 2, x: PANEL_WIDTH + (window.innerWidth - PANEL_WIDTH) * 0.5, y: window.innerHeight / 2, radius: 85, targetRadius: 85, color: '#00FF41', targetColor: '#00FF41', label: 'Science', pulse: 0, velocity: { x: -0.15, y: 0.25 } },
        { id: 3, x: PANEL_WIDTH + (window.innerWidth - PANEL_WIDTH) * 0.75, y: window.innerHeight / 2, radius: 95, targetRadius: 95, color: '#FF00E5', targetColor: '#FF00E5', label: 'Truth', pulse: 0, velocity: { x: 0.1, y: -0.2 } },
    ]);
    const particlesRef = useRef([]);
    const dashOffsetRef = useRef(0);
    const lastFrameTimeRef = useRef(0);
    const [draggingNode, setDraggingNode] = useState(null);

    useEffect(() => {
        const particles = [];
        for (let i = 0; i < 15; i++) {
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
        },
        pulseNode: (id) => {
            nodesRef.current = nodesRef.current.map(node =>
                node.id === id ? { ...node, pulse: 1.0 } : node
            );
        },
        getNodes: () => nodesRef.current.map(n => ({ id: n.id, x: n.x, y: n.y, radius: n.radius, color: n.color, label: n.label }))
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

            drawBackground(ctx, canvasWidth, canvasHeight);
            drawParticles(ctx, particlesRef.current, canvasWidth, canvasHeight);
            updateNodesPhysics(currentNodes, draggingNode, canvasWidth, canvasHeight, PANEL_WIDTH);
            drawConnections(ctx, currentNodes, dashOffsetRef);
            drawNodes(ctx, currentNodes);

            animationFrameId = window.requestAnimationFrame(render);
        };

        render();
        return () => window.cancelAnimationFrame(animationFrameId);
    }, [draggingNode]);

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

    return (
        <canvas
            ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ display: 'block' }}
        />
    );
}));

export default DawayirCanvas;
