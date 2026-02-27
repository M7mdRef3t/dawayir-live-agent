## 2025-05-24 - Canvas Optimization with React.memo
**Learning:** Imperative components that use `useRef` and direct DOM manipulation (like canvas) can still be triggered to re-render by parent updates if not memoized, even if they don't use props for rendering.
**Action:** Wrapped `DawayirCanvas` in `React.memo` to prevent unnecessary re-renders when parent state (like transcript or connection status) changes, as the canvas manages its own animation loop and state via refs.
