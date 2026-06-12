import { useEffect, useState } from "react";

// Koordinat Perpustakaan ITSB
export const ITSB_LAT = -6.3543048;
export const ITSB_LNG = 107.1984164;
// Radius diperbolehkan (meter) — area kampus ITSB
export const ALLOWED_RADIUS_M = 300;

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type GeofenceState =
  | { status: "checking" }
  | { status: "denied"; message: string }
  | { status: "outside"; distance: number; accuracy: number }
  | { status: "inside"; distance: number; accuracy: number };

/** Pantau lokasi pengguna, validasi terhadap geofence ITSB. */
export function useGeofence(): GeofenceState {
  const [state, setState] = useState<GeofenceState>({ status: "checking" });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState({ status: "denied", message: "Browser tidak mendukung lokasi." });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const distance = haversineMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          ITSB_LAT,
          ITSB_LNG,
        );
        // Toleransi: jika akurasi GPS buruk (>100m), beri ruang tambahan akurasi
        const tolerance = Math.min(pos.coords.accuracy, 150);
        const effective = distance - tolerance;
        if (effective <= ALLOWED_RADIUS_M) {
          setState({ status: "inside", distance, accuracy: pos.coords.accuracy });
        } else {
          setState({ status: "outside", distance, accuracy: pos.coords.accuracy });
        }
      },
      (err) => {
        setState({
          status: "denied",
          message:
            err.code === err.PERMISSION_DENIED
              ? "Izin lokasi ditolak. Mohon izinkan akses lokasi untuk absensi."
              : "Gagal membaca lokasi: " + err.message,
        });
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return state;
}
