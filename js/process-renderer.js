/**
 * Process Renderer Module
 * Canvas-based rendering of the process flow diagram with pan/zoom and interaction.
 */
const ProcessRenderer = (() => {
    let canvas, ctx;
    let offsetX = 0, offsetY = 0, scale = 1;
    let dragging = false, dragStartX, dragStartY;
    let dragNode = null, dragNodeOffX, dragNodeOffY;
    let hoveredNode = null;
    let selectedNode = null;
    let onNodeClick = null;
    let onNodeDoubleClick = null;

    const PROCESS_W = 200;
    const PROCESS_H = 80;
    const DATASET_R = 6;

    function init(canvasEl, callbacks) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        onNodeClick = callbacks.onNodeClick || null;
        onNodeDoubleClick = callbacks.onNodeDoubleClick || null;

        resize();
        window.addEventListener('resize', resize);

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('dblclick', onDblClick);
    }

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const headerH = canvas.parentElement.querySelector('.flow-toolbar')
            ? 0 : 0;
        canvas.width = rect.width;
        canvas.height = rect.height - canvas.offsetTop + rect.top;
        render();
    }

    function screenToWorld(sx, sy) {
        return {
            x: (sx - offsetX) / scale,
            y: (sy - offsetY) / scale
        };
    }

    function hitTest(wx, wy) {
        const processes = ProcessData.getProcesses();
        for (let i = processes.length - 1; i >= 0; i--) {
            const p = processes[i];
            if (wx >= p.x && wx <= p.x + PROCESS_W && wy >= p.y && wy <= p.y + PROCESS_H) {
                return { type: 'process', id: p.id, node: p };
            }
        }
        return null;
    }

    function onMouseDown(e) {
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const w = screenToWorld(sx, sy);
        const hit = hitTest(w.x, w.y);

        if (hit) {
            dragNode = hit.node;
            dragNodeOffX = w.x - hit.node.x;
            dragNodeOffY = w.y - hit.node.y;
        } else {
            dragging = true;
            dragStartX = e.clientX - offsetX;
            dragStartY = e.clientY - offsetY;
        }
    }

    function onMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        if (dragNode) {
            const w = screenToWorld(sx, sy);
            ProcessData.moveProcess(dragNode.id, w.x - dragNodeOffX, w.y - dragNodeOffY);
            render();
            return;
        }

        if (dragging) {
            offsetX = e.clientX - dragStartX;
            offsetY = e.clientY - dragStartY;
            render();
            return;
        }

        // Hover
        const w = screenToWorld(sx, sy);
        const hit = hitTest(w.x, w.y);
        const newHovered = hit ? hit.id : null;
        if (newHovered !== hoveredNode) {
            hoveredNode = newHovered;
            canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
            render();
        }
    }

    function onMouseUp(e) {
        if (dragNode) {
            // If barely moved, treat as click
            const rect = canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            const w = screenToWorld(sx, sy);
            const hit = hitTest(w.x, w.y);
            if (hit && onNodeClick) {
                selectedNode = hit.id;
                onNodeClick(hit.type, hit.id);
                render();
            }
            dragNode = null;
        }
        dragging = false;
    }

    function onDblClick(e) {
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const w = screenToWorld(sx, sy);
        const hit = hitTest(w.x, w.y);
        if (hit && onNodeDoubleClick) {
            onNodeDoubleClick(hit.type, hit.id);
        }
    }

    function onWheel(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.2, Math.min(3, scale * delta));

        // Zoom toward cursor
        offsetX = sx - (sx - offsetX) * (newScale / scale);
        offsetY = sy - (sy - offsetY) * (newScale / scale);
        scale = newScale;
        render();
    }

    function zoomIn() { scale = Math.min(3, scale * 1.2); render(); }
    function zoomOut() { scale = Math.max(0.2, scale * 0.8); render(); }

    function zoomFit() {
        const processes = ProcessData.getProcesses();
        if (processes.length === 0) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        processes.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x + PROCESS_W);
            maxY = Math.max(maxY, p.y + PROCESS_H);
        });
        const pad = 80;
        const w = maxX - minX + pad * 2;
        const h = maxY - minY + pad * 2;
        scale = Math.min(canvas.width / w, canvas.height / h, 1.5);
        offsetX = (canvas.width - w * scale) / 2 - (minX - pad) * scale;
        offsetY = (canvas.height - h * scale) / 2 - (minY - pad) * scale;
        render();
    }

    function setSelected(id) {
        selectedNode = id;
        render();
    }

    function render() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        drawGrid();
        drawConnections();
        drawProcesses();

        ctx.restore();
    }

    function drawGrid() {
        const step = 50;
        const w = screenToWorld(0, 0);
        const w2 = screenToWorld(canvas.width, canvas.height);
        const startX = Math.floor(w.x / step) * step;
        const startY = Math.floor(w.y / step) * step;

        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 0.5;
        for (let x = startX; x < w2.x; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, w.y);
            ctx.lineTo(x, w2.y);
            ctx.stroke();
        }
        for (let y = startY; y < w2.y; y += step) {
            ctx.beginPath();
            ctx.moveTo(w.x, y);
            ctx.lineTo(w2.x, y);
            ctx.stroke();
        }
    }

    function drawConnections() {
        const connections = ProcessData.getConnections();
        const processes = ProcessData.getProcesses();

        // Group connections by process pairs via shared datasets
        // Draw flow arrows between processes that share data
        const drawn = new Set();

        connections.forEach(conn => {
            if (conn.direction !== 'out') return;
            const ds = conn.datasetId;
            // Find processes that consume this dataset
            const consumers = connections.filter(c => c.datasetId === ds && c.direction === 'in');
            consumers.forEach(consumer => {
                const key = conn.processId + '->' + consumer.processId + ':' + ds;
                if (drawn.has(key)) return;
                drawn.add(key);

                const from = ProcessData.getProcess(conn.processId);
                const to = ProcessData.getProcess(consumer.processId);
                if (!from || !to) return;

                const dataset = ProcessData.getDataset(ds);
                drawArrow(from, to, dataset);
            });
        });
    }

    function drawArrow(fromProc, toProc, dataset) {
        const fx = fromProc.x + PROCESS_W / 2;
        const fy = fromProc.y + PROCESS_H / 2;
        const tx = toProc.x + PROCESS_W / 2;
        const ty = toProc.y + PROCESS_H / 2;

        // Calculate edge intersection points
        const from = edgePoint(fromProc.x, fromProc.y, PROCESS_W, PROCESS_H, tx - fx, ty - fy);
        const to = edgePoint(toProc.x, toProc.y, PROCESS_W, PROCESS_H, fx - tx, fy - ty);

        // Draw curved line
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const cx = mx - dy * 0.15;
        const cy = my + dx * 0.15;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(cx, cy, to.x, to.y);
        ctx.strokeStyle = '#adb5bd';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(to.y - cy, to.x - cx);
        const aLen = 10;
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - aLen * Math.cos(angle - 0.3), to.y - aLen * Math.sin(angle - 0.3));
        ctx.lineTo(to.x - aLen * Math.cos(angle + 0.3), to.y - aLen * Math.sin(angle + 0.3));
        ctx.closePath();
        ctx.fillStyle = '#adb5bd';
        ctx.fill();

        // Label on connection
        if (dataset) {
            const labelX = cx;
            const labelY = cy;
            ctx.font = '10px -apple-system, sans-serif';
            ctx.fillStyle = '#868e96';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const textW = ctx.measureText(dataset.name).width + 8;
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(labelX - textW / 2, labelY - 7, textW, 14);
            ctx.fillStyle = '#868e96';
            ctx.fillText(dataset.name, labelX, labelY);
        }
    }

    function edgePoint(rx, ry, rw, rh, dx, dy) {
        const cx = rx + rw / 2;
        const cy = ry + rh / 2;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        let t;
        if (absDx * rh > absDy * rw) {
            t = (rw / 2) / absDx;
        } else {
            t = (rh / 2) / absDy;
        }
        return { x: cx + dx * t, y: cy + dy * t };
    }

    function drawProcesses() {
        const processes = ProcessData.getProcesses();
        processes.forEach(p => {
            const isHovered = hoveredNode === p.id;
            const isSelected = selectedNode === p.id;

            // Shadow
            if (isHovered || isSelected) {
                ctx.shadowColor = 'rgba(0,0,0,0.15)';
                ctx.shadowBlur = 12;
                ctx.shadowOffsetY = 4;
            }

            // Box
            ctx.beginPath();
            roundRect(ctx, p.x, p.y, PROCESS_W, PROCESS_H, 10);
            ctx.fillStyle = p.color || '#4a6fa5';
            ctx.fill();

            if (isSelected) {
                ctx.strokeStyle = '#ffd43b';
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            // Title
            ctx.font = 'bold 13px -apple-system, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.name, p.x + PROCESS_W / 2, p.y + PROCESS_H / 2 - 10, PROCESS_W - 20);

            // Responsible
            ctx.font = '11px -apple-system, sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.fillText(p.responsible || '', p.x + PROCESS_W / 2, p.y + PROCESS_H / 2 + 10, PROCESS_W - 20);

            // Input/output indicators
            const inputs = ProcessData.getProcessInputs(p.id);
            const outputs = ProcessData.getProcessOutputs(p.id);

            // Small badge top-left: inputs count
            if (inputs.length > 0) {
                drawBadge(p.x + 8, p.y - 8, inputs.length + ' in', '#4a6fa5');
            }
            // Small badge top-right: outputs count
            if (outputs.length > 0) {
                drawBadge(p.x + PROCESS_W - 8, p.y - 8, outputs.length + ' ut', '#28a745');
            }
        });
    }

    function drawBadge(x, y, text, color) {
        ctx.font = '9px -apple-system, sans-serif';
        const w = ctx.measureText(text).width + 8;
        ctx.beginPath();
        roundRect(ctx, x - w / 2, y - 7, w, 14, 7);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
    }

    return {
        init, render, resize,
        zoomIn, zoomOut, zoomFit,
        setSelected
    };
})();
