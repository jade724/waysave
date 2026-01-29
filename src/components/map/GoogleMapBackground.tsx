import { useEffect, useRef } from "react";
import type { Station } from "../../App";

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/**
 * Dark map style to match app UI
 */
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0D0F14" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0D0F14" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8A8A8A" }] },

  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1A1D26" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0D0F14" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9CA3AF" }],
  },

  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0B1C26" }],
  },

  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#12141B" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6B7280" }],
  },

  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#12141B" }],
  },

  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1F2937" }],
  },
];

interface Props {
  userLocation: { lat: number; lng: number };
  markers: Station[];
  zoom?: number;
  onPinSelect: (station: Station) => void;
}

/**
 * Load Google Maps once globally
 */
let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps) return Promise.resolve();

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}

export default function GoogleMapBackground({
  userLocation,
  markers,
  zoom = 13,
  onPinSelect,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps().then(() => {
      if (cancelled || !mapRef.current) return;

      // Create map once
      if (!mapInstance.current) {
        mapInstance.current = new google.maps.Map(mapRef.current, {
          center: userLocation,
          zoom,
          disableDefaultUI: true,
          styles: DARK_MAP_STYLE,
        });
      }

      const map = mapInstance.current;
      map.setCenter(userLocation);

      // Clear old markers
      markerRefs.current.forEach((m) => m.setMap(null));
      markerRefs.current = [];

      // User location marker
      markerRefs.current.push(
        new google.maps.Marker({
          position: userLocation,
          map,
          icon: {
            url: "/pins/user.png",
            scaledSize: new google.maps.Size(36, 36),
          },
          zIndex: 1000,
        })
      );

      // Station markers
      markers.forEach((station) => {
        const iconUrl =
          station.type === "ev"
            ? "/pins/ev-pin.png"
            : "/pins/fuel-pin.png";

        const marker = new google.maps.Marker({
          position: { lat: station.lat, lng: station.lng },
          map,
          icon: {
            url: iconUrl,
            scaledSize: new google.maps.Size(36, 36),
          },
        });

        marker.addListener("click", () => onPinSelect(station));
        markerRefs.current.push(marker);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [userLocation, markers, zoom, onPinSelect]);

  return (
    <div className="w-full h-64 rounded-2xl overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
