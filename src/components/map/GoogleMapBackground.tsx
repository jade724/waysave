// src/components/map/GoogleMapBackground.tsx

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useState,
} from "react";
import type { Station } from "../../types/station";

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const ROUTE_COLORS = ["#00E0C6", "#3B82F6", "#F59E0B"];

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
  /** Which route is emphasized (0..n-1). Updates polyline weights without refetching. */
  selectedRouteIndex?: number;
  /** Called once per successful directions request with one entry per returned route. */
  onRoutesCalculated?: (routes: RouteInfo[]) => void;
}

export interface MapHandle {
  recenter: () => void;
  clearRoute: () => void;
}

let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (!googleMapsPromise) {
    googleMapsPromise = new Promise((resolve, reject) => {
      if (!GOOGLE_MAPS_KEY) {
        reject(new Error("Google Maps API key not found"));
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&loading=async&libraries=geometry`;
      script.async = true;
      script.defer = true;

      script.onload = () => resolve();
      script.onerror = (error) => reject(error);

      document.head.appendChild(script);
    });
  }

  return googleMapsPromise;
}

function legToRouteInfo(leg: google.maps.DirectionsLeg): RouteInfo {
  return {
    distance: leg.distance?.text || "Unknown",
    duration: leg.duration?.text || "Unknown",
    distanceValue: leg.distance?.value || 0,
    durationValue: leg.duration?.value || 0,
    steps: leg.steps || [],
  };
}

const GoogleMapBackground = forwardRef<MapHandle, Props>(
  (
    {
      userLocation,
      markers,
      zoom = 13,
      onPinSelect,
      selectedStation,
      showRoute = false,
      showTraffic = false,
      selectedRouteIndex = 0,
      onRoutesCalculated,
    },
    ref
  ) => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstance = useRef<google.maps.Map | null>(null);
    const markerRefs = useRef<google.maps.Marker[]>([]);
    const userMarkerRef = useRef<google.maps.Marker | null>(null);
    const directionsService = useRef<google.maps.DirectionsService | null>(null);
    const directionsRenderers = useRef<google.maps.DirectionsRenderer[]>([]);
    const lastDirectionsResultRef = useRef<google.maps.DirectionsResult | null>(null);
    const prevSelectedRouteIndexRef = useRef<number | null>(null);
    const trafficLayer = useRef<google.maps.TrafficLayer | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const onRoutesCalculatedRef = useRef(onRoutesCalculated);
    const selectedRouteIndexRef = useRef(selectedRouteIndex);

    useLayoutEffect(() => {
      onRoutesCalculatedRef.current = onRoutesCalculated;
    }, [onRoutesCalculated]);

    useLayoutEffect(() => {
      selectedRouteIndexRef.current = selectedRouteIndex;
    }, [selectedRouteIndex]);

    const clearRoute = useCallback(() => {
      directionsRenderers.current.forEach((renderer) => renderer.setMap(null));
      directionsRenderers.current = [];
      lastDirectionsResultRef.current = null;
      prevSelectedRouteIndexRef.current = null;
    }, []);

    /**
     * Full setOptions is required for reliable stroke updates; Maps may still nudge the camera.
     * When `preserveCamera` is true (user switched route option), capture center/zoom and restore
     * so the view stays put for comparing polylines. Initial route draw uses `preserveCamera: false`
     * so `fitBounds` in the directions callback is not undone.
     */
    const applyRouteHighlight = useCallback(
      (activeIndex: number, preserveCamera: boolean) => {
        const result = lastDirectionsResultRef.current;
        const map = mapInstance.current;
        if (!result?.routes?.length || !map) return;

        let center: google.maps.LatLng | undefined;
        let zoomLevel: number | undefined;
        if (preserveCamera) {
          center = map.getCenter() ?? undefined;
          zoomLevel = map.getZoom() ?? undefined;
          if (!center || zoomLevel === undefined) return;
        }

        directionsRenderers.current.forEach((renderer, i) => {
          const selected = i === activeIndex;
          renderer.setOptions({
            map,
            directions: result,
            routeIndex: i,
            suppressMarkers: true,
            preserveViewport: true,
            polylineOptions: {
              strokeColor: selected
                ? ROUTE_COLORS[i % ROUTE_COLORS.length]
                : "#4B5563",
              strokeWeight: selected ? 9 : 4,
              strokeOpacity: selected ? 1 : 0.28,
              zIndex: selected ? 100 : 10,
            },
          });
        });

        if (!preserveCamera || !center || zoomLevel === undefined) return;

        const restore = () => {
          map.setCenter(center);
          map.setZoom(zoomLevel);
        };
        restore();
        requestAnimationFrame(restore);
        requestAnimationFrame(() => requestAnimationFrame(restore));
        window.setTimeout(restore, 0);
        window.setTimeout(restore, 48);
        google.maps.event.addListenerOnce(map, "idle", restore);
      },
      []
    );

    useImperativeHandle(ref, () => ({
      recenter: () => {
        if (mapInstance.current) {
          mapInstance.current.panTo(userLocation);
          mapInstance.current.setZoom(zoom);
        }
      },
      clearRoute,
    }));

    // Map + markers
    useEffect(() => {
      let cancelled = false;

      loadGoogleMaps().then(() => {
        if (cancelled || !mapRef.current) return;

        if (!mapInstance.current) {
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
          setMapReady(true);
        }

        const map = mapInstance.current;
        map.setCenter(userLocation);

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

        markerRefs.current.forEach((m) => m.setMap(null));
        markerRefs.current = [];

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
            onPinSelect(station);
          });

          markerRefs.current.push(marker);
        });
      });

      return () => {
        cancelled = true;
      };
    }, [userLocation, markers, zoom, onPinSelect, selectedStation?.id]);

    // One directions request with alternatives; draw all polylines; parent picks active route for turn-by-turn.
    // deps use station id/lat/lng primitives so parent object identity changes do not refetch routes.
    useEffect(() => {
      if (
        !mapReady ||
        !showRoute ||
        !selectedStation ||
        !directionsService.current ||
        !mapInstance.current
      ) {
        if (!showRoute && directionsRenderers.current.length > 0) {
          clearRoute();
        }
        return;
      }

      const map = mapInstance.current;
      const origin = new google.maps.LatLng(userLocation.lat, userLocation.lng);
      const destination = new google.maps.LatLng(selectedStation.lat, selectedStation.lng);

      directionsService.current.route(
        {
          origin,
          destination,
          travelMode: google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: true,
        },
        (result, status) => {
          if (status !== google.maps.DirectionsStatus.OK || !result?.routes?.length) {
            return;
          }

          clearRoute();
          lastDirectionsResultRef.current = result;

          result.routes.forEach((_route, index) => {
            const selected = index === selectedRouteIndexRef.current;
            const renderer = new google.maps.DirectionsRenderer({
              map,
              directions: result,
              routeIndex: index,
              suppressMarkers: true,
              preserveViewport: index > 0,
              polylineOptions: {
                strokeColor: selected
                  ? ROUTE_COLORS[index % ROUTE_COLORS.length]
                  : "#4B5563",
                strokeWeight: selected ? 9 : 4,
                strokeOpacity: selected ? 1 : 0.28,
                zIndex: selected ? 100 : 10,
              },
            });
            directionsRenderers.current.push(renderer);
          });

          prevSelectedRouteIndexRef.current = selectedRouteIndexRef.current;

          const routeInfos: RouteInfo[] = result.routes.map((route) =>
            legToRouteInfo(route.legs[0])
          );
          onRoutesCalculatedRef.current?.(routeInfos);

          const bounds = new google.maps.LatLngBounds();
          bounds.extend(origin);
          bounds.extend(destination);
          result.routes.forEach((route) => {
            route.overview_path?.forEach((p) => bounds.extend(p));
          });
          map.fitBounds(bounds, 64);
        }
      );
    }, [
      mapReady,
      showRoute,
      selectedStation,
      userLocation.lat,
      userLocation.lng,
      clearRoute,
    ]);

    // Update polyline emphasis when user picks another alternative — preserve camera so they can compare routes.
    useEffect(() => {
      if (directionsRenderers.current.length === 0) return;

      const prev = prevSelectedRouteIndexRef.current;
      const userSwappedAlternative =
        prev !== null && prev !== selectedRouteIndex;
      prevSelectedRouteIndexRef.current = selectedRouteIndex;

      applyRouteHighlight(selectedRouteIndex, userSwappedAlternative);
    }, [selectedRouteIndex, applyRouteHighlight]);

    useEffect(() => {
      if (!trafficLayer.current || !mapInstance.current) return;

      if (showTraffic) {
        trafficLayer.current.setMap(mapInstance.current);
      } else {
        trafficLayer.current.setMap(null);
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
