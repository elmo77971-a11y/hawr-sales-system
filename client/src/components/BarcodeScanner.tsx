import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button } from "@/components/ui/button";

export function BarcodeScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { const reader = new BrowserMultiFormatReader(); let controls: { stop: () => void } | undefined; if (videoRef.current) reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } } }, videoRef.current, (result, error, currentControls) => { controls = currentControls; if (result) { onDetected(result.getText()); controls?.stop(); onClose(); } }); return () => controls?.stop(); }, [onClose, onDetected]);
  return <div className="mt-3 border-2 border-slate-950 bg-slate-950 p-3"><video ref={videoRef} className="w-full max-h-64 object-cover" muted playsInline /><div className="flex items-center justify-between gap-3 mt-3"><p className="text-xs text-white">وجّه الكاميرا إلى الباركود</p><Button type="button" onClick={onClose} variant="outline" className="rounded-none bg-white">إغلاق الكاميرا</Button></div></div>;
}
