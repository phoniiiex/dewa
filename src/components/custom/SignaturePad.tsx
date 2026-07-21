"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import SignaturePad from "signature_pad";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, Upload, PenLine, Download } from "lucide-react";

interface SignaturePadComponentProps {
  /** Current signature as a data URL (PNG) */
  value?: string;
  /** Callback when signature changes */
  onChange: (dataUrl: string | undefined) => void;
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
}

export function SignaturePadComponent({
  value,
  onChange,
  width = 320,
  height = 140,
}: SignaturePadComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize signature pad
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas resolution for retina
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgba(255,255,255,0)",
      penColor: "#1A1A2E",
      minWidth: 1,
      maxWidth: 2.5,
      velocityFilterWeight: 0.7,
    });

    pad.addEventListener("endStroke", () => {
      if (!pad.isEmpty()) {
        onChange(pad.toDataURL("image/png"));
      }
    });

    padRef.current = pad;

    // Load existing signature
    if (value && mode === "draw") {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }
      };
      img.src = value;
    }

    return () => {
      pad.off();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  const handleClear = useCallback(() => {
    padRef.current?.clear();
    onChange(undefined);
  }, [onChange]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      onChange(dataUrl);
      setMode("upload");
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    e.target.value = "";
  }, [onChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          واژوو
        </Label>
        <div className="flex gap-1">
          <Button
            type="button"
            variant={mode === "draw" ? "default" : "outline"}
            size="sm"
            className="h-6 text-[10px] gap-1 px-2"
            onClick={() => setMode("draw")}
          >
            <PenLine size={10} /> کێشان
          </Button>
          <Button
            type="button"
            variant={mode === "upload" ? "default" : "outline"}
            size="sm"
            className="h-6 text-[10px] gap-1 px-2"
            onClick={() => {
              setMode("upload");
              fileInputRef.current?.click();
            }}
          >
            <Upload size={10} /> هەڵکێشان
          </Button>
        </div>
      </div>

      {mode === "draw" ? (
        <div className="relative">
          <canvas
            ref={canvasRef}
            style={{ width, height }}
            className="border border-border rounded-lg bg-white cursor-crosshair touch-none"
          />
          {/* Guide line */}
          <div
            className="absolute pointer-events-none border-b border-dashed border-muted-foreground/20"
            style={{ bottom: 30, left: 16, right: 16 }}
          />
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-white flex items-center justify-center overflow-hidden"
          style={{ width, height }}>
          {value ? (
            <img
              src={value}
              alt="واژوو"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-xs text-muted-foreground flex flex-col items-center gap-1.5">
              <Upload size={20} className="text-muted-foreground/40" />
              وێنەی واژوو هەڵکێشە
            </div>
          )}
        </div>
      )}

      <div className="flex gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 flex-1"
          onClick={handleClear}
        >
          <Trash2 size={11} /> سڕینەوە
        </Button>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => {
              const a = document.createElement("a");
              a.href = value;
              a.download = "signature.png";
              a.click();
            }}
          >
            <Download size={11} /> داگرتن
          </Button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
}
