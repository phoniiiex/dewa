"use client";
// ============================================================
// DEWA — Signature Canvas
//
// HTML5 Canvas for drawing signatures with mouse/touch support.
// Saves as base64 PNG. Supports undo (stroke-level).
// ============================================================

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Undo2, Trash2, Save } from "lucide-react";

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

interface Stroke {
  points: { x: number; y: number }[];
}

export default function SignatureCanvas({ onSave, width = 400, height = 180 }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);

  // ── Redraw all strokes ──
  const redraw = useCallback((strokesToDraw: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const stroke of strokesToDraw) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, []);

  useEffect(() => { redraw(strokes); }, [strokes, redraw]);

  // ── Get position from event ──
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    setCurrentStroke([pos]);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    setCurrentStroke(prev => {
      const next = [...prev, pos];
      // Draw the current stroke live
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d")!;
        ctx.strokeStyle = "#1a1a2e";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (next.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(next[next.length - 2].x, next[next.length - 2].y);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        }
      }
      return next;
    });
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 1) {
      setStrokes(prev => [...prev, { points: currentStroke }]);
    }
    setCurrentStroke([]);
  };

  const undo = () => {
    setStrokes(prev => prev.slice(0, -1));
  };

  const clear = () => {
    setStrokes([]);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) return;
    // Re-render clean then export
    redraw(strokes);
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
    clear();
  };

  const isEmpty = strokes.length === 0;

  return (
    <div className="space-y-2">
      <div className="relative border-2 border-dashed border-border rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full cursor-crosshair touch-none"
          style={{ aspectRatio: `${width}/${height}` }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/40 text-sm">
            لێرە واژووەکەت بکێشە
          </div>
        )}
      </div>
      <div className="flex gap-1.5">
        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={undo} disabled={isEmpty}>
          <Undo2 className="size-3" /> گەڕانەوە
        </Button>
        <Button variant="outline" size="sm" className="text-xs gap-1" onClick={clear} disabled={isEmpty}>
          <Trash2 className="size-3" /> پاككردنەوە
        </Button>
        <Button size="sm" className="text-xs gap-1 ms-auto" onClick={save} disabled={isEmpty}>
          <Save className="size-3" /> پاشەکەوتکردن
        </Button>
      </div>
    </div>
  );
}
