import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, memo } from 'react';

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

    const lerp = (a, b, t) => a + (b - a) * t;

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
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        } catch {
            return colorB;
        }
    };

    // Parse hex to rgba string helper
    const hexToRgba = (hex, alpha) => {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    };

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

            // 1. Solid background (no gradient - much faster)
            ctx.fillStyle = '#080812';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. Particles (reduced count)
            const currentNodes = nodesRef.current;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            particlesRef.current.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
                ctx.globalAlpha = p.opacity;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1.0;

            // 3. Smooth transitions
            const lerpSpeed = 0.06;
            currentNodes.forEach(node => {
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
                    if (node.x - node.radius < PANEL_WIDTH || node.x + node.radius > canvas.width) node.velocity.x *= -1;
                    if (node.y - node.radius < 0 || node.y + node.radius > canvas.height) node.velocity.y *= -1;
                    node.x = Math.max(PANEL_WIDTH + node.radius, Math.min(canvas.width - node.radius, node.x));
                    node.y = Math.max(node.radius, Math.min(canvas.height - node.radius, node.y));
                }
            });

            // 4. Simple connections (solid lines, no gradients)
            dashOffsetRef.current += 0.2;
            ctx.setLineDash([8, 6]);
            ctx.lineDashOffset = -dashOffsetRef.current;
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            for (let i = 0; i < currentNodes.length; i++) {
                for (let j = i + 1; j < currentNodes.length; j++) {
                    ctx.beginPath();
                    ctx.moveTo(currentNodes[i].x, currentNodes[i].y);
                    ctx.lineTo(currentNodes[j].x, currentNodes[j].y);
                    ctx.stroke();
                }
            }
            ctx.setLineDash([]);

            // 5. Draw nodes (simple fills, no gradients, no shadows)
            currentNodes.forEach(node => {
                const currentRadius = node.radius + (node.pulse * 20);

                // Pulse ring
                if (node.pulse > 0.1) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, currentRadius + 10, 0, Math.PI * 2);
                    ctx.strokeStyle = hexToRgba(node.color, node.pulse * 0.5);
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // Outer glow circle (simple semi-transparent, no gradient)
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
