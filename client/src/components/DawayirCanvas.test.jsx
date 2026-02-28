import React, { useRef } from 'react';
import { render, fireEvent, act, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DawayirCanvas from './DawayirCanvas';

describe('DawayirCanvas', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Mock getBoundingClientRect for mouse interactions
        Element.prototype.getBoundingClientRect = vi.fn(() => ({
            width: 800,
            height: 600,
            top: 0,
            left: 0,
            bottom: 600,
            right: 800,
        }));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('renders the canvas element correctly', () => {
        const { container } = render(<DawayirCanvas />);
        const canvas = container.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
        expect(canvas.style.display).toBe('block');
        // Width and height should be set based on window dimensions
        expect(canvas.width).toBe(window.innerWidth);
        expect(canvas.height).toBe(window.innerHeight);
    });

    it('exposes imperative handles correctly', () => {
        let canvasRef;
        const TestWrapper = () => {
            canvasRef = useRef(null);
            return <DawayirCanvas ref={canvasRef} />;
        };

        render(<TestWrapper />);

        expect(canvasRef.current).toBeDefined();
        expect(typeof canvasRef.current.updateNode).toBe('function');
        expect(typeof canvasRef.current.pulseNode).toBe('function');
        expect(typeof canvasRef.current.getNodes).toBe('function');

        // Check initial nodes
        const nodes = canvasRef.current.getNodes();
        expect(nodes).toHaveLength(3);
        expect(nodes[0].id).toBe(1);
        expect(nodes[0].label).toBe('Awareness');
        expect(nodes[1].id).toBe(2);
        expect(nodes[1].label).toBe('Science');
        expect(nodes[2].id).toBe(3);
        expect(nodes[2].label).toBe('Truth');
    });

    it('updates node properties correctly via updateNode', () => {
        let canvasRef;
        const TestWrapper = () => {
            canvasRef = useRef(null);
            return <DawayirCanvas ref={canvasRef} />;
        };

        render(<TestWrapper />);

        act(() => {
            canvasRef.current.updateNode(1, { radius: 100, color: '#FFFFFF', label: 'Updated Awareness' });
        });

        // The target properties are updated internally
        // Wait for rendering/animation frame logic
        act(() => {
            vi.advanceTimersByTime(200);
        });

        const nodes = canvasRef.current.getNodes();
        const updatedNode = nodes.find(n => n.id === 1);
        expect(updatedNode.label).toBe('Updated Awareness');
    });

    it('handles mouse interactions correctly', () => {
        let canvasRef;
        const TestWrapper = () => {
            canvasRef = useRef(null);
            return <DawayirCanvas ref={canvasRef} />;
        };

        const { container } = render(<TestWrapper />);
        const canvas = container.querySelector('canvas');

        const initialNodes = canvasRef.current.getNodes();
        const targetNode = initialNodes[0];

        // Simulate mousedown on the node
        fireEvent.mouseDown(canvas, {
            clientX: targetNode.x,
            clientY: targetNode.y
        });

        // Simulate mousemove to drag the node
        const newX = targetNode.x + 50;
        const newY = targetNode.y + 50;

        fireEvent.mouseMove(canvas, {
            clientX: newX,
            clientY: newY
        });

        // Verify the node position has updated
        const draggedNodes = canvasRef.current.getNodes();
        const draggedNode = draggedNodes.find(n => n.id === targetNode.id);
        expect(draggedNode.x).toBe(newX);
        expect(draggedNode.y).toBe(newY);

        // Simulate mouseup to release
        fireEvent.mouseUp(canvas);
    });

    it('handles window resize events correctly', () => {
        let canvasRef;
        const TestWrapper = () => {
            canvasRef = useRef(null);
            return <DawayirCanvas ref={canvasRef} />;
        };

        const { container } = render(<TestWrapper />);
        const canvas = container.querySelector('canvas');

        // Store initial nodes
        const initialNodes = canvasRef.current.getNodes();

        // Change window dimensions
        window.innerWidth = 1024;
        window.innerHeight = 768;

        act(() => {
            window.dispatchEvent(new Event('resize'));
        });

        // Wait for potential re-renders or updates
        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(canvas.width).toBe(1024);
        expect(canvas.height).toBe(768);

        // Check node scaling (e.g. initial x was updated)
        const updatedNodes = canvasRef.current.getNodes();
        // Just verify nodes are still present and accessible
        expect(updatedNodes.length).toBe(3);
    });
});
