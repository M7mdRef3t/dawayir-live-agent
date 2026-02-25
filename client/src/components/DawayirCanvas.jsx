import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

const DawayirCanvas = forwardRef((props, ref) => {
    const canvasRef = useRef(null);
    const nodesRef = useRef([
        { id: 1, x: window.innerWidth / 4, y: window.innerHeight / 2, radius: 70, targetRadius: 70, color: '#00F5FF', targetColor: '#00F5FF', label: 'الوعي', pulse: 0, velocity: { x: 0.2, y: 0.1 } },
        { id: 2, x: window.innerWidth / 2, y: window.innerHeight / 2, radius: 85, targetRadius: 85, color: '#00FF41', targetColor: '#00FF41', label: 'العلم', pulse: 0, velocity: { x: -0.15, y: 0.25 } },
        { id: 3, x: (3 * window.innerWidth) / 4, y: window.innerHeight / 2, radius: 95, targetRadius: 95, color: '#FF00E5', targetColor: '#FF00E5', label: 'الحقيقة', pulse: 0, velocity: { x: 0.1, y: -0.2 } },
    ]);
    const particlesRef = useRef([]);
    const dashOffsetRef = useRef(0);
    const [draggingNode, setDraggingNode] = useState(null);

    // Initialize particles for the "Mental Space" background
    useEffect(() => {
        const particles = [];
        for (let i = 0; i < 80; i++) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 2.5 + 0.5,
                opacity: Math.random() * 0.4 + 0.1,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3
            });
        }
        particlesRef.current = particles;
    }, []);

    // Helper: lerp for smooth value transitions
    const lerp = (a, b, t) => a + (b - a) * t;

    // Helper: lerp hex colors
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

    useImperativeHandle(ref, () => ({
        updateNode: (id, updates) => {
            nodesRef.current = nodesRef.current.map(node => {
                if (node.id !== id) return node;
                const newNode = { ...node };
                if (updates.radius !== undefined) newNode.targetRadius = updates.radius;
                if (updates.color !== undefined) newNode.targetColor = updates.color;
                if (updates.label !== undefined) newNode.label = updates.label;
                if (updates.x !== undefined) newNode.x = updates.x;
                if (updates.y !== undefined) newNode.y = updates.y;
                return newNode;
            });
        },
        pulseNode: (id) => {
            nodesRef.current = nodesRef.current.map(node =>
                node.id === id ? { ...node, pulse: 1.0 } : node
            );
        },
        getNodes: () => nodesRef.current.map(n => ({ id: n.id, x: n.x, y: n.y, radius: n.radius, color: n.color, label: n.label }))
    }));

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const oldW = canvas.width;
            const oldH = canvas.height;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // Scale node positions proportionally
            const scaleX = canvas.width / (oldW || canvas.width);
            const scaleY = canvas.height / (oldH || canvas.height);
            nodesRef.current.forEach(node => {
                node.x *= scaleX;
                node.y *= scaleY;
            });
            particlesRef.current.forEach(p => {
                p.x *= scaleX;
                p.y *= scaleY;
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 1. Draw Background Gradient
            const bgGradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, canvas.width / 1.2
            );
            bgGradient.addColorStop(0, '#0c0c1e');
            bgGradient.addColorStop(1, '#050505');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. Update and Draw Particles (with node attraction)
            const currentNodes = nodesRef.current;
            particlesRef.current.forEach(p => {
                // Subtle attraction to nearest node
                let closestDist = Infinity;
                let attractX = 0, attractY = 0;
                currentNodes.forEach(node => {
                    const dx = node.x - p.x;
                    const dy = node.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < closestDist && dist < 250) {
                        closestDist = dist;
                        attractX = dx / dist * 0.02;
                        attractY = dy / dist * 0.02;
                    }
                });

                p.x += p.speedX + attractX;
                p.y += p.speedY + attractY;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1.0;

            // 3. Smooth transitions (lerp radius and color toward target)
            const lerpSpeed = 0.04;
            currentNodes.forEach(node => {
                // Smooth radius transition
                if (Math.abs(node.radius - node.targetRadius) > 0.5) {
                    node.radius = lerp(node.radius, node.targetRadius, lerpSpeed);
                } else {
                    node.radius = node.targetRadius;
                }

                // Smooth color transition
                if (node.color !== node.targetColor) {
                    node.color = lerpColor(node.color, node.targetColor, lerpSpeed * 2);
                    // Snap when close
                    if (lerpColor(node.color, node.targetColor, 0) === node.targetColor) {
                        node.color = node.targetColor;
                    }
                }

                // Pulse decay
                if (node.pulse > 0) node.pulse -= 0.012;
                if (node.pulse < 0) node.pulse = 0;

                // Gentle floating
                if (!draggingNode || draggingNode !== node.id) {
                    node.x += node.velocity.x;
                    node.y += node.velocity.y;

                    // Bounce off boundaries
                    if (node.x - node.radius < 0 || node.x + node.radius > canvas.width) node.velocity.x *= -1;
                    if (node.y - node.radius < 0 || node.y + node.radius > canvas.height) node.velocity.y *= -1;
                }
            });

            // 4. Draw animated connections with dashed lines
            dashOffsetRef.current += 0.3;
            ctx.setLineDash([8, 6]);
            ctx.lineDashOffset = -dashOffsetRef.current;
            ctx.lineWidth = 1.5;
            for (let i = 0; i < currentNodes.length; i++) {
                for (let j = i + 1; j < currentNodes.length; j++) {
                    const grad = ctx.createLinearGradient(
                        currentNodes[i].x, currentNodes[i].y,
                        currentNodes[j].x, currentNodes[j].y
                    );
                    grad.addColorStop(0, currentNodes[i].color + '33');
                    grad.addColorStop(0.5, '#ffffff11');
                    grad.addColorStop(1, currentNodes[j].color + '33');

                    ctx.strokeStyle = grad;
                    ctx.beginPath();
                    ctx.moveTo(currentNodes[i].x, currentNodes[i].y);
                    ctx.lineTo(currentNodes[j].x, currentNodes[j].y);
                    ctx.stroke();
                }
            }
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;

            // 5. Draw nodes (Glassmorphism & Glow)
            currentNodes.forEach(node => {
                const currentRadius = node.radius + (node.pulse * 25);

                // Multiple pulse rings for highlight
                if (node.pulse > 0) {
                    for (let ring = 0; ring < 3; ring++) {
                        const ringR = currentRadius + 12 + (ring * 12);
                        const ringAlpha = Math.max(0, node.pulse - ring * 0.25);
                        if (ringAlpha <= 0) continue;
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, ringR, 0, Math.PI * 2);
                        ctx.strokeStyle = node.color + Math.floor(ringAlpha * 180).toString(16).padStart(2, '0');
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    }
                }

                // Shadow/Glow
                ctx.shadowBlur = 35 + (node.pulse * 50);
                ctx.shadowColor = node.color;

                // Main Circle Gradient (Glass-like)
                const grad = ctx.createRadialGradient(
                    node.x - currentRadius / 3, node.y - currentRadius / 3, currentRadius / 10,
                    node.x, node.y, currentRadius
                );
                grad.addColorStop(0, node.color + 'EE');
                grad.addColorStop(0.6, node.color + '88');
                grad.addColorStop(1, node.color + '33');

                ctx.beginPath();
                ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();

                // Inner highlights for depth
                ctx.shadowBlur = 0;

                // Primary specular highlight
                ctx.beginPath();
                ctx.arc(node.x - currentRadius / 3, node.y - currentRadius / 3, currentRadius / 3.5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
                ctx.fill();

                // Secondary smaller highlight
                ctx.beginPath();
                ctx.arc(node.x - currentRadius / 5, node.y - currentRadius / 4, currentRadius / 7, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.fill();

                // Reset shadow for text
                ctx.fillStyle = '#FFF';
                ctx.font = `600 ${Math.floor(currentRadius / 3.5)}px 'Outfit', sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(node.label, node.x, node.y);

                // Subtle ID indicator below label
                ctx.font = `400 ${Math.floor(currentRadius / 6)}px 'Inter', sans-serif`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                ctx.fillText(`⬡ ${node.id}`, node.x, node.y + currentRadius / 2.5);
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

        if (clickedNode) {
            setDraggingNode(clickedNode.id);
        }
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
});

export default DawayirCanvas;
