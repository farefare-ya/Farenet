import { useEffect, useRef, useState } from "react";

interface ImageCropModalProps {
  file: File;
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
  maxBytes?: number;
  title?: string;
}

const VIEWPORT = 280;

export default function ImageCropModal({ file, onCancel, onDone, maxBytes = 100 * 1024, title = "Crop Photo" }: ImageCropModalProps) {
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ left: 0, top: 0 }); // top-left of the image, in viewport px
  const [processing, setProcessing] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; origLeft: number; origTop: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImgEl(img);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale = imgEl ? Math.max(VIEWPORT / imgEl.width, VIEWPORT / imgEl.height) : 1;
  const displayScale = baseScale * zoom;
  const dispW = imgEl ? imgEl.width * displayScale : 0;
  const dispH = imgEl ? imgEl.height * displayScale : 0;

  function clampPos(left: number, top: number, w: number, h: number) {
    const minLeft = Math.min(0, VIEWPORT - w);
    const minTop = Math.min(0, VIEWPORT - h);
    return {
      left: Math.max(minLeft, Math.min(0, left)),
      top: Math.max(minTop, Math.min(0, top)),
    };
  }

  function centeredPos(w: number, h: number) {
    return { left: (VIEWPORT - w) / 2, top: (VIEWPORT - h) / 2 };
  }

  useEffect(() => {
    if (!imgEl) return;
    const c = centeredPos(dispW, dispH);
    setPos(clampPos(c.left, c.top, dispW, dispH));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgEl]);

  function handleZoomChange(newZoom: number) {
    if (!imgEl) {
      setZoom(newZoom);
      return;
    }
    // Keep whatever natural-image point is currently at the viewport
    // center fixed in place, instead of scaling outward from the
    // top-left corner (which looked like the image "stretching down").
    const oldScale = baseScale * zoom;
    const newScale = baseScale * newZoom;
    const centerX = (VIEWPORT / 2 - pos.left) / oldScale;
    const centerY = (VIEWPORT / 2 - pos.top) / oldScale;
    const newLeft = VIEWPORT / 2 - centerX * newScale;
    const newTop = VIEWPORT / 2 - centerY * newScale;
    const newDispW = imgEl.width * newScale;
    const newDispH = imgEl.height * newScale;
    setZoom(newZoom);
    setPos(clampPos(newLeft, newTop, newDispW, newDispH));
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origLeft: pos.left, origTop: pos.top };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPos(clampPos(dragState.current.origLeft + dx, dragState.current.origTop + dy, dispW, dispH));
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  async function handleConfirm() {
    if (!imgEl) return;
    setProcessing(true);
    try {
      // Map the viewport square back to natural image pixel coordinates.
      const sx = -pos.left / displayScale;
      const sy = -pos.top / displayScale;
      const sSize = VIEWPORT / displayScale;

      const canvas = document.createElement("canvas");
      const outputSize = 480;
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.drawImage(imgEl, sx, sy, sSize, sSize, 0, 0, outputSize, outputSize);

      let quality = 0.85;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      let attempts = 0;
      while (dataUrl.length * 0.75 > maxBytes && attempts < 20) {
        quality = Math.max(0.35, quality - 0.1);
        dataUrl = canvas.toDataURL("image/jpeg", quality);
        attempts++;
      }
      onDone(dataUrl);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm bg-[#1c2733] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#242f3d] flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">{title}</h2>
          <button onClick={onCancel} className="text-[#7d90a0] hover:text-white text-sm">
            Cancel
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 px-6 py-6">
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-full touch-none select-none cursor-move"
            style={{ width: VIEWPORT, height: VIEWPORT, background: "#0e1621" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {imgEl && (
              <img
                src={imgEl.src}
                alt="crop preview"
                draggable={false}
                className="absolute pointer-events-none"
                style={{ left: pos.left, top: pos.top, width: dispW, height: dispH }}
              />
            )}
          </div>

          <div className="w-full flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#7d90a0] flex-shrink-0">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="flex-1 accent-[#5288c1]"
            />
          </div>

          <p className="text-[#7d90a0] text-xs text-center">Drag to reposition, use the slider to zoom</p>

          <button
            onClick={handleConfirm}
            disabled={!imgEl || processing}
            className="w-full py-2.5 rounded-xl bg-[#5288c1] text-white text-sm font-medium disabled:opacity-40 hover:bg-[#4577ad] transition-colors"
          >
            {processing ? "Saving..." : "Save Photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
