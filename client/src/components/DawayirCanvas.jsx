import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

const DawayirCanvas = forwardRef((props, ref) => {
    const canvasRef = useRef(null);
    const [nodes, setNodes] = useState([
        { id: 1, x: window.innerWidth / 4, y: window.innerHeight / 2, radius: 60, color: '#FF5733', label: 'الوعي', pulse: 0 },
        { id: 2, x: window.innerWidth / 2, y: window.innerHeight / 2, radius: 70, color: '#33FF57', label: 'العلم', pulse: 0 },
        { id: 3, x: (3 * window.innerWidth) / 4, y: window.innerHeight / 2, radius: 80, color: '#3357FF', label: 'الحقيقة', pulse: 0 },
    ]);
    const [draggingNode, setDraggingNode] = useState(null);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
        updateNode: (id, updates) => {
            setNodes(prev => prev.map(node =>
                node.id === id ? { ...node, ...updates } : node
            ));
        },
        pulseNode: (id) => {
            setNodes(prev => prev.map(node =>
                node.id === id ? { ...node, pulse: 1.0 } : node
            ));
        }
    }));

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update pulse animations
            setNodes(prev => prev.map(node => ({
                ...node,
                pulse: node.pulse > 0 ? node.pulse - 0.02 : 0
            })));

            // Draw connections
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                }
            }
            ctx.stroke();

            // Draw nodes
            nodes.forEach(node => {
                const currentRadius = node.radius + (node.pulse * 20);

                // Pulse ring
                if (node.pulse > 0) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, currentRadius + 10, 0, Math.PI * 2);
                    ctx.strokeStyle = `${node.color}${Math.floor(node.pulse * 255).toString(16).padStart(2, '0')}`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                ctx.beginPath();
                ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);

                // Glow
                ctx.shadowBlur = 20 + (node.pulse * 30);
                ctx.shadowColor = node.color;

                ctx.fillStyle = node.color;
                ctx.fill();

                // Reset shadow for text
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#FFF';
                ctx.font = `bold ${Math.floor(currentRadius / 4)}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText(node.label, node.x, node.y + (currentRadius / 8));
            });

            animationFrameId = window.requestAnimationFrame(render);
        };

        render();
        return () => window.cancelAnimationFrame(animationFrameId);
    }, [nodes]);

    const handleMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clickedNode = nodes.find(node => {
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

        setNodes(prevNodes =>
            prevNodes.map(node =>
                node.id === draggingNode ? { ...node, x, y } : node
            )
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
            style={{ background: '#070707', display: 'block' }}
        />
    );
});

export default DawayirCanvas;
