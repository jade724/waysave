// GoogleMapBackground.tsx
// Fully polished version for your WaySave app

import { useEffect, useRef } from "react";
import type { Station } from "../../App";

// Load API key from .env
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Improved Figma-style dark theme
const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0D0F14" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ea0b5" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#000" }] },

  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1A1D26" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#aaa" }],
  },
  {
    featureType: "water",
    stylers: [{ color: "#07090d" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative",
    stylers: [{ visibility: "off" }],
  },
];

interface Props {
  userLocation: { lat: number; lng: number };
  markers: Station[];
  zoom: number;
  className?: string;
  onPinSelect: (station: Station) => void;
}

export default function GoogleMapBackground({
  userLocation,
  markers,
  zoom,
  className = "",
  onPinSelect,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const map = useRef<google.maps.Map | null>(null);

  // Load the Google Maps script once
  const loadGoogleMaps = (): Promise<void> => {
    return new Promise((resolve) => {
      if (window.google) return resolve();

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}`;
      script.async = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  };

  useEffect(() => {
    let mounted = true;

    loadGoogleMaps().then(() => {
      if (!mounted) return;

      // Initialize the map once
      if (!map.current && mapRef.current) {
        map.current = new google.maps.Map(mapRef.current, {
          center: userLocation,
          zoom,
          disableDefaultUI: true,
          styles: darkMapStyles,
        });
      }

      if (!map.current) return;

      // Center map on user
      map.current.setCenter(userLocation);

      // ----- Remove old markers -----
      (map.current as any)._markers?.forEach((m: google.maps.Marker) =>
        m.setMap(null)
      );
      (map.current as any)._markers = [];

      // ----- USER MARKER -----
      const userMarker = new google.maps.Marker({
        position: userLocation,
        map: map.current,
        zIndex: 999,
        icon: {
          url: "/pins/user.png", // You must add this file
          scaledSize: new google.maps.Size(22, 22),
        },
      });

      (map.current as any)._markers.push(userMarker);

      // ----- STATION MARKERS -----
      markers.forEach((station) => {
        const iconUrl =
          station.type === "fuel"
            ? "/pins/fuel-pin.png"
            : "/pins/ev-pin.png";

        const marker = new google.maps.Marker({
          position: { lat: station.lat, lng: station.lng },
          map: map.current!,
          icon: {
            url: iconUrl,
            scaledSize: new google.maps.Size(46, 46),
          },
        });

        marker.addListener("click", () => {
          onPinSelect(station);
        });

        (map.current as any)._markers.push(marker);
      });
    });

    return () => {
      mounted = false;
    };
  }, [userLocation, markers, zoom]);

  return <div ref={mapRef} className={`w-full h-full ${className}`} />;
}
