// Wrapper face-api.js: lazy-load model, deteksi wajah, ekstrak descriptor (vektor 128-d).
import * as faceapi from "face-api.js";

const MODEL_URL = "/models";
let loadPromise: Promise<void> | null = null;

export function loadFaceModels(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
    })();
  }
  return loadPromise;
}

/** Opsi detector — inputSize 416 lebih akurat, scoreThreshold 0.4 lebih permisif untuk deteksi. */
export const detectorOptions = new faceapi.TinyFaceDetectorOptions({
  inputSize: 416,
  scoreThreshold: 0.4,
});

export async function detectSingleFace(input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) {
  const result = await faceapi
    .detectSingleFace(input, detectorOptions)
    .withFaceLandmarks(true)
    .withFaceDescriptor();
  return result ?? null;
}

export function descriptorDistance(a: Float32Array | number[], b: Float32Array | number[]) {
  const va = a instanceof Float32Array ? a : Float32Array.from(a);
  const vb = b instanceof Float32Array ? b : Float32Array.from(b);
  return faceapi.euclideanDistance(va, vb);
}

/**
 * Cari user terdekat dari kumpulan kandidat.
 * threshold default 0.5 = seimbang (face-api default 0.6, semakin kecil semakin ketat).
 */
export function findBestMatch<T extends { face_descriptor: number[] }>(
  query: Float32Array,
  candidates: T[],
  threshold = 0.5,
): { user: T; distance: number } | null {
  let best: { user: T; distance: number } | null = null;
  for (const c of candidates) {
    const d = descriptorDistance(query, c.face_descriptor);
    if (!best || d < best.distance) best = { user: c, distance: d };
  }
  if (best && best.distance <= threshold) return best;
  return null;
}
