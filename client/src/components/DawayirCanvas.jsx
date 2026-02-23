import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

const DawayirCanvas = forwardRef((props, ref) => {
    const canvasRef = useRef(null);
    const nodesRef = useRef([
        { id: 1, x: window.innerWidth / 4, y: window.innerHeight / 2, radius: 70, color: '#00F5FF', label: 'الوعي', pulse: 0, velocity: { x: 0.2, y: 0.1 } },
        { id: 2, x: window.innerWidth / 2, y: window.innerHeight / 2, radius: 85, color: '#00FF41', label: 'العلم', pulse: 0, velocity: { x: -0.15, y: 0.25 } },
        { id: 3, x: (3 * window.innerWidth) / 4, y: window.innerHeight / 2, radius: 95, color: '#FF00E5', label: 'الحقيقة', pulse: 0, velocity: { x: 0.1, y: -0.2 } },
    ]);
    const particlesRef = useRef([]);
    const [draggingNode, setDraggingNode] = useState(null);

    // Initialize particles for the "Mental Space" background
    useEffect(() => {
        const particles = [];
        for (let i = 0; i < 60; i++) {
            particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 2,
                opacity: Math.random() * 0.5,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5
            });
        }
        particlesRef.current = particles;
    }, []);

    useImperativeHandle(ref, () => ({
        updateNode: (id, updates) => {
            nodesRef.current = nodesRef.current.map(node =>
                node.id === id ? { ...node, ...updates } : node
            );
        },
        pulseNode: (id) => {
            nodesRef.current = nodesRef.current.map(node =>
                node.id === id ? { ...node, pulse: 1.0 } : node
            );
        },
        getNodes: () => nodesRef.current
    }));

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

            // 2. Update and Draw Particles
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

            const currentNodes = nodesRef.current;

            // 3. Update pulse animations and floating movement
            currentNodes.forEach(node => {
                if (node.pulse > 0) node.pulse -= 0.015;
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

            // 4. Draw connections with glowing effect
            ctx.lineWidth = 1;
            for (let i = 0; i < currentNodes.length; i++) {
                for (let j = i + 1; j < currentNodes.length; j++) {
                    const grad = ctx.createLinearGradient(
                        currentNodes[i].x, currentNodes[i].y,
                        currentNodes[j].x, currentNodes[j].y
                    );
                    grad.addColorStop(0, currentNodes[i].color + '22');
                    grad.addColorStop(1, currentNodes[j].color + '22');

                    ctx.strokeStyle = grad;
                    ctx.beginPath();
                    ctx.moveTo(currentNodes[i].x, currentNodes[i].y);
                    ctx.lineTo(currentNodes[j].x, currentNodes[j].y);
                    ctx.stroke();
                }
            }

            // 5. Draw nodes (Glassmorphism & Glow)
            currentNodes.forEach(node => {
                const currentRadius = node.radius + (node.pulse * 25);

                // External Pulse Ring
                if (node.pulse > 0) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, currentRadius + 15, 0, Math.PI * 2);
                    ctx.strokeStyle = node.color + Math.floor(node.pulse * 255).toString(16).padStart(2, '0');
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }

                // Shadow/Glow
                ctx.shadowBlur = 30 + (node.pulse * 40);
                ctx.shadowColor = node.color;

                // Main Circle Gradient (Glass-like)
                const grad = ctx.createRadialGradient(
                    node.x - currentRadius / 3, node.y - currentRadius / 3, currentRadius / 10,
                    node.x, node.y, currentRadius
                );
                grad.addColorStop(0, node.color + 'EE');
                grad.addColorStop(1, node.color + '44');

                ctx.beginPath();
                ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();

                // Inner highlight for 3D effect
                ctx.beginPath();
                ctx.arc(node.x - currentRadius / 3, node.y - currentRadius / 3, currentRadius / 4, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fill();

                // Reset shadow for text
                ctx.shadowBlur = 0;
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
