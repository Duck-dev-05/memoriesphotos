"use client";

import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import styles from "./map.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getOptimizedMediaUrl } from "@/lib/media";

function MapBounds({ photos }: { photos: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (photos.length > 0) {
      const bounds = L.latLngBounds(photos.map((p) => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [map, photos]);
  return null;
}


// Separate component to memoize the icon and prevent MarkerClusterGroup re-render bugs
function PhotoMarker({ photo }: { photo: any }) {
  const router = useRouter();
  
  const eventHandlers = React.useMemo(() => ({
    click: () => {
      router.push(`/photo/${photo.id}`, { scroll: false });
    },
  }), [photo.id, router]);

  const isLocalVideo = !photo.url?.includes("res.cloudinary.com") && photo.url?.match(/\.(mp4|mov|avi|webm|mkv)$/i);

  const icon = React.useMemo(() => {
    if (isLocalVideo) {
      // Fallback for local videos where we can't easily extract a thumbnail frame
      return L.divIcon({
        className: styles.customMarker,
        html: `<div class="${styles.markerImageContainer}" style="display:flex;align-items:center;justify-content:center;background:var(--bg-tertiary);"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent-1)"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -24],
      });
    }

    const getOptimizedUrl = (url: string, width: number) => {
      if (!url || !url.includes("res.cloudinary.com")) return url;
      let imageUrl = url.replace(/\.(mp4|mov|avi|webm|mkv)$/i, '.jpg');
      const parts = imageUrl.split("/upload/");
      if (parts.length === 2) {
        return `${parts[0]}/upload/f_auto,c_limit,w_${width},q_auto/${parts[1]}`;
      }
      return imageUrl;
    };

    const optimizedUrl = getOptimizedUrl(photo.url || "", 100);
    return L.divIcon({
      className: styles.customMarker,
      html: `<div class="${styles.markerImageContainer}"><img src="${optimizedUrl}" class="${styles.markerImage}" alt="marker" /></div>`,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24],
    });
  }, [photo.url, isLocalVideo]);

  const popupOptimizedUrl = React.useMemo(() => {
    if (isLocalVideo) return photo.url;
    if (!photo.url || !photo.url.includes("res.cloudinary.com")) return photo.url || "";
    let imageUrl = (photo.url || "").replace(/\.(mp4|mov|avi|webm|mkv)$/i, '.jpg');
    const parts = imageUrl.split("/upload/");
    if (parts.length === 2) {
      return `${parts[0]}/upload/f_auto,c_limit,w_400,q_auto/${parts[1]}`;
    }
    return imageUrl;
  }, [photo.url, isLocalVideo]);

  return (
    <Marker position={[photo.latitude, photo.longitude]} icon={icon} eventHandlers={eventHandlers} />
  );
}

export default function MapComponent({ photos }: { photos: any[] }) {
  React.useEffect(() => {
    // Fix default icons just in case, though we use custom HTML icons
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  const center: [number, number] = photos.length > 0 
    ? [photos[0].latitude, photos[0].longitude] 
    : [21.0285, 105.8542]; // Default to Hanoi

  return (
    <div className={styles.mapContainer}>
      <MapContainer center={center} zoom={5} className={styles.mapWrapper} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapBounds photos={photos} />
        
        <MarkerClusterGroup 
          chunkedLoading
          iconCreateFunction={(cluster: any) => {
            const markers = cluster.getAllChildMarkers();
            const firstMarker = markers[0];
            // Extract the HTML from the first marker's divIcon
            const iconHtml = firstMarker.options.icon?.options?.html || "";
            const count = cluster.getChildCount();
            
            return L.divIcon({
              className: "custom-cluster-icon",
              html: `
                <div style="position: relative; display: inline-block;">
                  ${iconHtml}
                  <div style="position: absolute; top: -8px; right: -8px; background: var(--accent-1, #c97a7e); color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 10;">
                    ${count}
                  </div>
                </div>
              `,
              iconSize: [48, 48],
              iconAnchor: [24, 24]
            });
          }}
        >
          {photos.map((photo) => (
            <PhotoMarker key={photo.id} photo={photo} />
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
