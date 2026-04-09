// Proxies Open Charge Map so the API key can stay in Netlify env (OCM_API_KEY), not the client bundle.
import type { Handler, HandlerEvent } from "@netlify/functions";

const OCM_KEY = process.env.OCM_API_KEY ?? process.env.VITE_OCM_API_KEY;

const handler: Handler = async (event: HandlerEvent) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const { lat, lng, distance, maxresults } = event.queryStringParameters || {};

  if (!lat || !lng) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing lat or lng" }),
    };
  }

  if (!OCM_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Server missing OCM_API_KEY — set it in Netlify environment variables.",
      }),
    };
  }

  const dist = distance ?? "50";
  const max = maxresults ?? "50";

  const url = new URL("https://api.openchargemap.io/v3/poi/");
  url.searchParams.set("output", "json");
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lng);
  url.searchParams.set("distance", dist);
  url.searchParams.set("distanceunit", "KM");
  url.searchParams.set("maxresults", max);
  url.searchParams.set("key", OCM_KEY);

  try {
    const res = await fetch(url.toString());
    const bodyText = await res.text();
    return {
      statusCode: res.ok ? 200 : res.status,
      headers,
      body: bodyText,
    };
  } catch (err) {
    console.error("fetch-openchargemap:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "OCM request failed" }),
    };
  }
};

export { handler };
