"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Image from "next/image";
import Link from "next/link";
import { getOptimizedMediaUrl } from "@/lib/media";

// Fix missing marker icons in React Leaflet
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to adjust bounds to fit all markers
function BoundsAdjuster({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  return null;
}

export default function DynamicMap({ photos }: { photos: any[] }) {
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

  useEffect(() => {
    if (photos && photos.length > 0) {
      const b = new L.LatLngBounds([]);
      photos.forEach((photo) => {
        if (photo.latitude && photo.longitude) {
          b.extend([photo.latitude, photo.longitude]);
        }
      });
      setBounds(b);
    }
  }, [photos]);

  if (!photos || photos.length === 0) return null;

  // Default center if no valid bounds yet (though BoundsAdjuster will override)
  const defaultCenter: [number, number] = [21.0285, 105.8542]; // Hanoi

  return (
    <MapContainer
      center={bounds && bounds.isValid() ? bounds.getCenter() : defaultCenter}
      zoom={5}
      style={{ width: "100%", height: "100%", zIndex: 1 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {bounds && <BoundsAdjuster bounds={bounds} />}
      
      {photos.map((photo) => {
        if (!photo.latitude || !photo.longitude) return null;
        const src = photo.url || photo.imageData;
        const isVideo = src?.match(/\.(mp4|webm|ogg|mov)$/i);

        return (
          <Marker
            key={photo.id}
            position={[photo.latitude, photo.longitude]}
            icon={customIcon}
          >
            <Popup>
              <div style={{ width: "200px", padding: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <Link href={`/photo/${photo.id}`} style={{ display: "block", position: "relative", width: "100%", height: "140px", borderRadius: "4px", overflow: "hidden" }}>
                  {isVideo ? (
                    <video src={getOptimizedMediaUrl(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Image src={src} alt={photo.altText || "Photo"} fill style={{ objectFit: "cover" }} sizes="200px" />
                  )}
                </Link>
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: "0 0 4px 0", fontWeight: 600, fontSize: "14px" }}>
                    {photo.locationName || photo.altText || "Kỷ niệm"}
                  </p>
                  <Link href={`/photo/${photo.id}`} style={{ fontSize: "12px", color: "var(--accent-1)", textDecoration: "none" }}>
                    Xem chi tiết &rarr;
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
