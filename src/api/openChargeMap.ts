// src/api/openChargeMap.ts
// Open Charge Map — prefers Netlify proxy (key on server); falls back to VITE_OCM_API_KEY for local Vite-only dev.

import type { ConnectorFilters } from "../lib/preferences";
import { devWarn } from "../lib/logger";
import { NETLIFY_FUNCTIONS_BASE } from "../lib/netlifyFunctionsUrl";

export interface OCMStation {
  AddressInfo: {
    ID: number;
    Title: string;
    Latitude: number;
    Longitude: number;
    Distance: number;
  };
  Connections: Array<{
    ConnectionType?: { FormalName?: string; Title?: string };
  }>;
}

// Map our connector keys to the strings OCM uses in ConnectionType titles
const CONNECTOR_KEYWORDS: Record<keyof ConnectorFilters, string[]> = {
  CCS: ["ccs", "combo"],
  CHAdeMO: ["chademo"],
  Type2: ["type 2", "type2", "iec 62196"],
};

function stationMatchesConnectors(
  station: OCMStation,
  connectors: ConnectorFilters
): boolean {
  const anyActive = Object.values(connectors).some(Boolean);
  if (!anyActive) return false;
  return station.Connections.some((conn) => {
    const label = (
      conn.ConnectionType?.FormalName ??
      conn.ConnectionType?.Title ??
      ""
    ).toLowerCase();
    return (Object.keys(connectors) as Array<keyof ConnectorFilters>).some(
      (key) =>
        connectors[key] && CONNECTOR_KEYWORDS[key].some((kw) => label.includes(kw))
    );
  });
}

/** Returns `null` if the proxy failed; an empty array means OCM returned no POIs. */
async function fetchOCMViaProxy(
  lat: number,
  lng: number,
  distanceKM: number,
  maxresults: number
): Promise<OCMStation[] | null> {
  try {
    const url = new URL(`${NETLIFY_FUNCTIONS_BASE}/fetch-openchargemap`, window.location.origin);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lng", String(lng));
    url.searchParams.set("distance", String(distanceKM));
    url.searchParams.set("maxresults", String(maxresults));

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (!Array.isArray(data)) return null;
    return data as OCMStation[];
  } catch {
    return null;
  }
}

async function fetchOCMDirect(
  lat: number,
  lng: number,
  distanceKM: number,
  maxresults: number
): Promise<OCMStation[]> {
  const key = import.meta.env.VITE_OCM_API_KEY as string | undefined;
  if (!key) {
    devWarn(
      "Open Charge Map: set OCM_API_KEY in Netlify (proxy) or VITE_OCM_API_KEY for local Vite-only dev."
    );
    return [];
  }

  const url = `https://api.openchargemap.io/v3/poi/?output=json&latitude=${lat}&longitude=${lng}&distance=${distanceKM}&distanceunit=KM&maxresults=${maxresults}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    devWarn("OCM API error:", res.statusText);
    return [];
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    devWarn("OCM returned invalid data");
    return [];
  }
  return data as OCMStation[];
}

export async function fetchEVStations(
  lat: number,
  lng: number,
  distanceKM = 5,
  connectors: ConnectorFilters
): Promise<OCMStation[]> {
  const maxresults = 50;

  try {
    const fromProxy = await fetchOCMViaProxy(lat, lng, distanceKM, maxresults);
    const stations =
      fromProxy !== null
        ? fromProxy
        : await fetchOCMDirect(lat, lng, distanceKM, maxresults);

    if (connectors) {
      return stations.filter((s) => stationMatchesConnectors(s, connectors));
    }
    return stations;
  } catch (err) {
    devWarn("OCM fetch error:", err);
    return [];
  }
}
