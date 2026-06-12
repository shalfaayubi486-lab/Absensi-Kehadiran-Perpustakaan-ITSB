import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  overlay?: React.ReactNode;
}

/** Tampilan webcam reusable: bingkai gelap dengan corner brackets neon. */
const CameraView = forwardRef<HTMLVideoElement, Props>(({ className, overlay }, ref) => {
  return (
    <div className={cn("relative w-full mx-auto aspect-[4/3] rounded-3xl overflow-hidden glass-strong shadow-soft", className)}>
      <video
        ref={ref}
        playsInline
        muted
        className="w-full h-full object-cover scale-x-[-1]"
      />

      {/* Scan line */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-70"
          style={{ animation: "scanline 3s linear infinite", top: 0 }}
        />
      </div>

      {/* Corner brackets */}
      <div className="absolute inset-0 pointer-events-none">
        {[
          "top-5 left-5 border-t-2 border-l-2 rounded-tl-lg",
          "top-5 right-5 border-t-2 border-r-2 rounded-tr-lg",
          "bottom-5 left-5 border-b-2 border-l-2 rounded-bl-lg",
          "bottom-5 right-5 border-b-2 border-r-2 rounded-br-lg",
        ].map((c, i) => (
          <span key={i} className={`absolute h-8 w-8 border-accent/80 ${c}`} />
        ))}
      </div>

      {/* HUD top */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-[10px] font-mono-tight text-foreground/70 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/40 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
          REC · LIVE
        </div>
        <div className="px-2 py-1 rounded-md bg-background/40 backdrop-blur">
          1280×720 · 30fps
        </div>
      </div>

      {overlay && (
        <div className="absolute inset-0 flex items-end justify-center p-5 pointer-events-none">
          <div className="pointer-events-auto">{overlay}</div>
        </div>
      )}

      <style>{`
        @keyframes scanline {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
});
CameraView.displayName = "CameraView";
export default CameraView;
