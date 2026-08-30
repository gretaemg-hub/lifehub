import { useEffect, useRef } from 'react';

const ERASER_PIXEL_SIZE = 22;
const OBJECT_ERASE_THRESHOLD = 14;

// Standard point-to-segment distance, clamping t to [0,1] — used by
// the object eraser's hit test.
function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function findStrokeAtPoint(strokes, x, y) {
  for (let i = strokes.length - 1; i >= 0; i--) {
    const stroke = strokes[i];
    if (stroke.mode === 'eraser-pixel') continue;
    if (stroke.points.length === 1) {
      if (Math.hypot(x - stroke.points[0].x, y - stroke.points[0].y) <= OBJECT_ERASE_THRESHOLD) return stroke.id;
      continue;
    }
    for (let j = 1; j < stroke.points.length; j++) {
      const d = distanceToSegment(x, y, stroke.points[j - 1].x, stroke.points[j - 1].y, stroke.points[j].x, stroke.points[j].y);
      if (d <= OBJECT_ERASE_THRESHOLD) return stroke.id;
    }
  }
  return null;
}

function drawStrokeFull(ctx, stroke) {
  ctx.globalCompositeOperation = stroke.mode === 'eraser-pixel' ? 'destination-out' : 'source-over';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (stroke.points.length === 1) {
    const p = stroke.points[0];
    const pressure = p.pressure > 0 ? p.pressure : 0.5;
    const radius = (stroke.mode === 'eraser-pixel' ? ERASER_PIXEL_SIZE : Math.max(1, pressure * 6)) / 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = stroke.mode === 'eraser-pixel' ? 'rgba(0,0,0,1)' : stroke.color;
    ctx.fill();
  } else {
    for (let i = 1; i < stroke.points.length; i++) {
      const p0 = stroke.points[i - 1];
      const p1 = stroke.points[i];
      const pressure = p1.pressure > 0 ? p1.pressure : 0.5;
      ctx.lineWidth = stroke.mode === 'eraser-pixel' ? ERASER_PIXEL_SIZE : Math.max(1, pressure * 6);
      ctx.strokeStyle = stroke.mode === 'eraser-pixel' ? 'rgba(0,0,0,1)' : stroke.color;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

// The pen/eraser drawing layer, overlaid on top of a note's typed
// blocks — a near-verbatim port of the friends-demo's canvas logic
// (handlePointerDown/Move/Up, drawLiveSegment, redrawCanvas,
// eraseObjectAt). Strokes are always the source of truth: the canvas
// is a pure render target, redrawn from `strokes` on every change
// (including resize), never persisted as an image.
export default function NoteCanvas({ strokes, tool, eraserMode, color, onCommitStroke, onEraseObject }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const currentStrokePointsRef = useRef([]);
  const erasedThisGestureRef = useRef(new Set());

  // Keep the canvas backing-store pixels matched to the wrapping
  // page-surface's rendered size, and redraw whenever that or the
  // stroke data changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    function resizeAndRedraw() {
      const w = Math.round(wrap.clientWidth);
      const h = Math.round(wrap.clientHeight);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      strokes.forEach((s) => drawStrokeFull(ctx, s));
    }

    resizeAndRedraw();
    const observer = new ResizeObserver(resizeAndRedraw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [strokes]);

  function getCanvasPoint(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function drawLiveSegment(x0, y0, x1, y1, pressure) {
    const ctx = canvasRef.current.getContext('2d');
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = tool === 'eraser' ? ERASER_PIXEL_SIZE : Math.max(1, pressure * 6);
    ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  function handlePointerDown(e) {
    if (tool === 'type') return;
    const canvas = canvasRef.current;
    isDrawingRef.current = true;
    canvas.setPointerCapture(e.pointerId);
    const pos = getCanvasPoint(e);
    lastPointRef.current = pos;

    if (tool === 'eraser' && eraserMode === 'object') {
      erasedThisGestureRef.current = new Set();
      const hitId = findStrokeAtPoint(strokes, pos.x, pos.y);
      if (hitId && !erasedThisGestureRef.current.has(hitId)) {
        erasedThisGestureRef.current.add(hitId);
        onEraseObject(hitId);
      }
      return;
    }
    currentStrokePointsRef.current = [{ x: pos.x, y: pos.y, pressure: e.pressure || 0.5 }];
  }

  function handlePointerMove(e) {
    if (!isDrawingRef.current) return;
    const pos = getCanvasPoint(e);

    if (tool === 'eraser' && eraserMode === 'object') {
      const hitId = findStrokeAtPoint(strokes, pos.x, pos.y);
      if (hitId && !erasedThisGestureRef.current.has(hitId)) {
        erasedThisGestureRef.current.add(hitId);
        onEraseObject(hitId);
      }
      lastPointRef.current = pos;
      return;
    }

    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    currentStrokePointsRef.current.push({ x: pos.x, y: pos.y, pressure });
    drawLiveSegment(lastPointRef.current.x, lastPointRef.current.y, pos.x, pos.y, pressure);
    lastPointRef.current = pos;
  }

  function handlePointerUp() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (tool === 'eraser' && eraserMode === 'object') return;
    if (currentStrokePointsRef.current.length > 0) {
      onCommitStroke({
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        color: tool === 'eraser' ? null : color,
        mode: tool === 'eraser' ? 'eraser-pixel' : 'pen',
        points: currentStrokePointsRef.current,
      });
      currentStrokePointsRef.current = [];
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: tool === 'type' ? 'none' : 'auto',
          cursor: tool === 'type' ? 'text' : 'crosshair',
          touchAction: 'none',
        }}
      />
    </div>
  );
}
