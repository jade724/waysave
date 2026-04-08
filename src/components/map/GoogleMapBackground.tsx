// src/components/map/GoogleMapBackground.tsx

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import type { Station } from "../../App";

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Dark map styling
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0D0F14" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0D0F14" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8A8A8A" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2e3445" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0D0F14" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9CA3AF" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0B1C26" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#12141B" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6B7280" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#12141B" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1F2937" }] },
];

// Route information interface
export interface RouteInfo {
  distance: string;
  duration: string;
  distanceValue: number;
  durationValue: number;
  steps: google.maps.DirectionsStep[];
}

interface Props {
  userLocation: { lat: number; lng: number };
  markers: Station[];
  zoom?: number;
  onPinSelect: (station: Station) => void;
  selectedStation?: Station | null;
  showRoute?: boolean;
  showTraffic?: boolean;
  onRouteCalculated?: (info: RouteInfo) => void;
}

export interface MapHandle {
  recenter: () => void;
  clearRoute: () => void;
  showAlternativeRoutes: () => void;
}

// Singleton loader for Google Maps
let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps) {
    console.log("✅ Google Maps already loaded");
    return Promise.resolve();
  }

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      if (!GOOGLE_MAPS_KEY) {
        console.error("❌ Google Maps API key is missing!");
        reject(new Error("Google Maps API key not found"));
        return;
      }

      console.log("📍 Loading Google Maps API...");
      
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&loading=async&libraries=geometry`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log("✅ Google Maps API loaded successfully");
        resolve();
      };
      
      script.onerror = (error) => {
        console.error("❌ Failed to load Google Maps:", error);
        reject(error);
      };
      
      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}

const GoogleMapBackground = forwardRef<MapHandle, Props>(
  ({ 
    userLocation, 
    markers, 
    zoom = 13, 
    onPinSelect, 
    selectedStation, 
    showRoute = false,
    showTraffic = false,
    onRouteCalculated 
  }, ref) => {
    
    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstance = useRef<google.maps.Map | null>(null);
    const markerRefs = useRef<google.maps.Marker[]>([]);
    const userMarkerRef = useRef<google.maps.Marker | null>(null);
    const directionsService = useRef<google.maps.DirectionsService | null>(null);
    const directionsRenderers = useRef<google.maps.DirectionsRenderer[]>([]);
    const trafficLayer = useRef<google.maps.TrafficLayer | null>(null);

    // Clear all routes
    const clearRoute = () => {
      directionsRenderers.current.forEach(renderer => {
        renderer.setMap(null);
      });
      directionsRenderers.current = [];
      console.log("🧹 Route cleared");
    };

    // Show alternative routes (up to 3)
    const showAlternativeRoutes = () => {
      if (!selectedStation || !directionsService.current || !mapInstance.current) {
        console.warn("⚠️ Cannot show alternatives - missing data");
        return;
      }

      console.log("🔀 Calculating alternative routes...");

      directionsService.current.route(
        {
          origin: new google.maps.LatLng(userLocation.lat, userLocation.lng),
          destination: new google.maps.LatLng(selectedStation.lat, selectedStation.lng),
          travelMode: google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: true,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            clearRoute();

            const colors = ["#00E0C6", "#3B82F6", "#F59E0B"];
            
            result.routes.forEach((route, index) => {
              const renderer = new google.maps.DirectionsRenderer({
                map: mapInstance.current!,
                directions: result,
                routeIndex: index,
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: colors[index] || "#FFFFFF",
                  strokeWeight: index === 0 ? 5 : 3,
                  strokeOpacity: index === 0 ? 0.9 : 0.6,
                },
              });

              directionsRenderers.current.push(renderer);

              const leg = route.legs[0];
              console.log(`Route ${index + 1}: ${leg.distance?.text} - ${leg.duration?.text}`);
            });

            console.log(`✅ Showing ${result.routes.length} alternative routes`);
          } else {
            console.error("❌ Failed to calculate alternatives:", status);
          }
        }
      );
    };

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      recenter: () => {
        if (mapInstance.current) {
          mapInstance.current.panTo(userLocation);
          mapInstance.current.setZoom(zoom);
          console.log("🎯 Map recentered");
        }
      },
      clearRoute,
      showAlternativeRoutes,
    }));

    // Initialize map and markers
    useEffect(() => {
      let cancelled = false;

      loadGoogleMaps().then(() => {
        if (cancelled || !mapRef.current) return;

        // Create map once
        if (!mapInstance.current) {
          console.log("🏗️ Creating map instance...");
          
          mapInstance.current = new google.maps.Map(mapRef.current, {
            center: userLocation,
            zoom,
            disableDefaultUI: true,
            styles: DARK_MAP_STYLE,
            zoomControl: false,
            mapTypeControl: false,
            scaleControl: false,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: false,
          });

          directionsService.current = new google.maps.DirectionsService();
          trafficLayer.current = new google.maps.TrafficLayer();
          console.log("✅ Map created successfully");
        }

        const map = mapInstance.current;
        map.setCenter(userLocation);

        // User location marker
        if (userMarkerRef.current) {
          userMarkerRef.current.setPosition(userLocation);
        } else {
          userMarkerRef.current = new google.maps.Marker({
            position: userLocation,
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: "#00E0C6",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            },
            zIndex: 1000,
            title: "Your Location",
          });
        }

        // Clear old markers
        markerRefs.current.forEach((m) => m.setMap(null));
        markerRefs.current = [];

        // Create station markers
        markers.forEach((station) => {
          const isEV = station.type === "ev";
          const isSelected = selectedStation?.id === station.id;
          
          const marker = new google.maps.Marker({
            position: { lat: station.lat, lng: station.lng },
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: isSelected ? 14 : 9,
              fillColor: isEV ? "#3B82F6" : "#F59E0B",
              fillOpacity: isSelected ? 1 : 0.9,
              strokeColor: isSelected ? "#00E0C6" : "#ffffff",
              strokeWeight: isSelected ? 4 : 2,
            },
            title: station.name,
            zIndex: isSelected ? 999 : 1,
            animation: isSelected ? google.maps.Animation.BOUNCE : undefined,
          });

          marker.addListener("click", () => {
            console.log("📍 Station clicked:", station.name);
            onPinSelect(station);
          });
          
          markerRefs.current.push(marker);
        });

        console.log(`✅ Rendered ${markers.length} station markers`);
      });

      return () => {
        cancelled = true;
      };
    }, [userLocation, markers, zoom, onPinSelect, selectedStation]);

    // Route calculation effect
    useEffect(() => {
      if (!showRoute || !selectedStation || !directionsService.current || !mapInstance.current) {
        if (directionsRenderers.current.length > 0 && !showRoute) {
          clearRoute();
        }
        return;
      }

      console.log("🛣️ Calculating route to:", selectedStation.name);

      directionsService.current.route(
        {
          origin: new google.maps.LatLng(userLocation.lat, userLocation.lng),
          destination: new google.maps.LatLng(selectedStation.lat, selectedStation.lng),
          travelMode: google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: false,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            console.log("✅ Route calculated successfully");
            
            clearRoute();

            const renderer = new google.maps.DirectionsRenderer({
              map: mapInstance.current!,
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: "#00E0C6",
                strokeWeight: 5,
                strokeOpacity: 0.8,
              },
            });

            renderer.setDirections(result);
            directionsRenderers.current.push(renderer);

            const route = result.routes[0];
            if (route?.legs[0]) {
              const leg = route.legs[0];
              
              const routeInfo: RouteInfo = {
                distance: leg.distance?.text || "Unknown",
                duration: leg.duration?.text || "Unknown",
                distanceValue: leg.distance?.value || 0,
                durationValue: leg.duration?.value || 0,
                steps: leg.steps || [],
              };

              console.log(`📍 Distance: ${routeInfo.distance}`);
              console.log(`⏱️ Duration: ${routeInfo.duration}`);

              onRouteCalculated?.(routeInfo);

              // ✅ FIX: Use proper Padding type
              const bounds = new google.maps.LatLngBounds();
              bounds.extend(new google.maps.LatLng(userLocation.lat, userLocation.lng));
              bounds.extend(new google.maps.LatLng(selectedStation.lat, selectedStation.lng));
              
              // Use number for padding instead of object
              mapInstance.current?.fitBounds(bounds, 80);
            }
          } else {
            console.error("❌ Route calculation failed:", status);
          }
        }
      );
    }, [showRoute, selectedStation, userLocation, onRouteCalculated]);

    // Traffic layer toggle
    useEffect(() => {
      if (!trafficLayer.current || !mapInstance.current) return;

      if (showTraffic) {
        trafficLayer.current.setMap(mapInstance.current);
        console.log("🚦 Traffic layer enabled");
      } else {
        trafficLayer.current.setMap(null);
        console.log("🚫 Traffic layer disabled");
      }
    }, [showTraffic]);

    return (
      <div className="w-full h-full">
        <div ref={mapRef} className="w-full h-full" />
      </div>
    );
  }
);

GoogleMapBackground.displayName = "GoogleMapBackground";

export default GoogleMapBackground;