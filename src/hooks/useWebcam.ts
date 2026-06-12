import { useCallback, useEffect, useRef, useState } from "react";

/** Hook untuk akses webcam dengan cleanup otomatis. */
export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attach stream ke elemen video. Bisa dipanggil ulang setelah element re-mount.
  const attach = useCallback(async () => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      try {
        await videoRef.current.play();
      } catch {
        /* autoplay block ok */
      }
    }
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        streamRef.current = stream;
      }
      await attach();
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengakses kamera");
      setReady(false);
    }
  }, [attach]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, ready, error, start, stop, attach };
}
