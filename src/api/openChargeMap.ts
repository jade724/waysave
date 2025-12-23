// openChargeMap.ts
// Clean API wrapper with safety + typed return

export interface OCMStation {
  AddressInfo: {
    Title: string;
    Latitude: number;
    Longitude: number;
    Distance: number;
  };
  Connections: any[];
}

const OCM_API_KEY = import.meta.env.VITE_OCM_API_KEY; // your .env

export async function fetchEVStations(
  lat: number,
  lng: number,
  distanceKM = 5
): Promise<OCMStation[]> {
  try {
    const url = `https://api.openchargemap.io/v3/poi/?output=json&latitude=${lat}&longitude=${lng}&distance=${distanceKM}&distanceunit=KM&maxresults=20&key=${OCM_API_KEY}`;

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

    return data as OCMStation[];
  } catch (err) {
    console.error("OCM fetch error:", err);
    return [];
  }
}
