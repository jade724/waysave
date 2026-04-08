// src/api/openChargeMap.ts
// Clean API wrapper with connector filter support for Open Charge Map.

import type { ConnectorFilters } from "../lib/preferences";

export interface OCMStation {
  AddressInfo: {
    ID: number;
    Title: string;
    Latitude: number;
    Longitude: number;
    Distance: number;
  };
  Connections: Array<{
    ConnectionType?:{ FormalName?: string; Title?: string}
  }>;
}

const OCM_API_KEY = import.meta.env.VITE_OCM_API_KEY;

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
  // If no connector filter is active at all, show everything
  const anyActive = Object.values(connectors).some(Boolean);
  if (!anyActive) return true;
  return station.Connections.some((conn) => {
    const label = (
      conn.ConnectionType?.FormalName ??
      conn.ConnectionType?.Title ??
      ""
    ).toLowerCase();
    return (Object.keys(connectors) as Array<keyof ConnectorFilters>).some(
      (key) => connectors[key] && CONNECTOR_KEYWORDS[key].some((kw) => label.includes(kw))
    );
  });
}


export async function fetchEVStations(
  lat: number,
  lng: number,
  distanceKM = 5,
  connectors: ConnectorFilters
): Promise<OCMStation[]> {
  try {
    const url = `https://api.openchargemap.io/v3/poi/?output=json&latitude=${lat}&longitude=${lng}&distance=${distanceKM}&distanceunit=KM&maxresults=50&key=${OCM_API_KEY}`;

    const res = await fetch(url);

    if (!res.ok) {
      console.error("OCM API error:", res.statusText);
      return [];
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error("OCM returned invalid data:", data);
      return [];
    }

    const stations = data as OCMStation[];
    // Apply connector filter if provided
    if (connectors) {
      return stations.filter((s) => stationMatchesConnectors(s, connectors));
    }
    return stations;
  } catch (err) {
    console.error("OCM fetch error:", err);
    return [];
  }
}
