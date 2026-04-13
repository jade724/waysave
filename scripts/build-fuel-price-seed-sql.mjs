/**
 * Generates docs/seed-fuel-prices-from-snapshot.sql
 * Green badge = petrol (first price), black = diesel (second price). c/L → EUR/L = c/100.
 * Missing values: estimated (noted in SQL comments / note field).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../docs/seed-fuel-prices-from-snapshot.sql");

const USER = "110ac0ab-130c-4998-b0ed-da59f43469a1";

/** @type {Array<{ name: string; ext: string; lat: number; lng: number; petrolC: number | null; dieselC: number | null; ts: string; petrolEst?: boolean; dieselEst?: boolean }>} */
const rows = [
  // Original fuel prices .txt
  { name: "Circle K Ninth Lock", ext: "seed-ninth-lock", lat: 53.3203, lng: -6.3947, petrolC: 191.9, dieselC: 208.9, ts: "2026-04-13T15:28:46Z" },
  { name: "Parnell Road Service Station", ext: "seed-parnell", lat: 53.3262, lng: -6.2684, petrolC: 191.8, dieselC: 214.8, ts: "2026-04-04T17:32:25Z" },
  { name: "Texaco Rolestown", ext: "seed-rolestown", lat: 53.527, lng: -6.245, petrolC: null, dieselC: 208.9, ts: "2026-03-27T21:42:19Z", petrolEst: true },
  { name: "Spar Express Hollystown", ext: "seed-hollystown", lat: 53.423, lng: -6.418, petrolC: 201.9, dieselC: 221.9, ts: "2026-03-25T10:48:21Z" },
  { name: "Spar Kylemore Rd", ext: "seed-kylemore", lat: 53.336, lng: -6.322, petrolC: 189.9, dieselC: 205.9, ts: "2026-04-10T08:33:22Z" },
  { name: "SPAR Maxol Forecourt", ext: "seed-ratoath", lat: 53.508, lng: -6.464, petrolC: 189.9, dieselC: null, ts: "2026-03-31T14:41:08Z", dieselEst: true },
  { name: "Spar Crumlin Road", ext: "seed-crumlin", lat: 53.324, lng: -6.305, petrolC: 184.9, dieselC: 204.9, ts: "2026-03-26T12:39:04Z" },
  { name: "Texaco N4", ext: "seed-n4", lat: 53.357, lng: -6.448, petrolC: 192.9, dieselC: 217.9, ts: "2026-04-12T22:20:46Z" },
  { name: "The Huntsman Service Station", ext: "seed-huntsman", lat: 53.323, lng: -6.354, petrolC: 191.9, dieselC: 215.9, ts: "2026-04-03T07:25:54Z" },
  {
    name: "Top Oil Collinstown",
    ext: "seed-top-collinstown",
    lat: 53.429,
    lng: -6.244,
    petrolC: 194.9,
    dieselC: 214.9,
    ts: "2026-04-12T15:49:48Z",
    petrolEst: true,
  },
  { name: "Top Oil Kilbride Service Station", ext: "seed-kilbride", lat: 53.52, lng: -6.652, petrolC: 201.9, dieselC: 219.9, ts: "2026-03-25T10:52:30Z" },

  // Screenshots — names chosen to match typical Google Places titles (brand + location)
  { name: "Airport Energy", ext: "seed-airport-energy", lat: 53.426, lng: -6.244, petrolC: 189.9, dieselC: 212.9, ts: "2026-04-09T00:00:00Z" },
  { name: "Amien Street Service Station", ext: "seed-amiens", lat: 53.351, lng: -6.248, petrolC: 189.9, dieselC: 205.9, ts: "2026-04-10T00:00:00Z" },
  { name: "Applegreen Malahide Road", ext: "seed-apple-malahide-rd", lat: 53.444, lng: -6.154, petrolC: 175.8, dieselC: 215.8, ts: "2026-03-22T00:00:00Z" },
  { name: "Applegreen St Margaret's Road", ext: "seed-apple-st-margarets", lat: 53.451, lng: -6.218, petrolC: 198.8, dieselC: 215.8, ts: "2026-04-04T00:00:00Z" },
  { name: "Applegreen North Street Swords", ext: "seed-apple-north-st-swords", lat: 53.459, lng: -6.218, petrolC: 192.9, dieselC: 217.8, ts: "2026-04-12T00:00:00Z" },

  { name: "Circle K Blanchardstown", ext: "seed-ck-blanch-main", lat: 53.389, lng: -6.375, petrolC: 197.9, dieselC: 219.9, ts: "2026-04-13T08:11:09Z" },
  { name: "Circle K Airside", ext: "seed-ck-airside", lat: 53.444, lng: -6.224, petrolC: 191.9, dieselC: 217.9, ts: "2026-04-12T15:49:15Z" },
  { name: "Circle K Artane", ext: "seed-ck-artane", lat: 53.388, lng: -6.155, petrolC: 174.9, dieselC: 172.9, ts: "2025-11-19T14:25:45Z" },
  { name: "Circle K Ashtown", ext: "seed-ck-ashtown", lat: 53.378, lng: -6.308, petrolC: 198.9, dieselC: 208.9, ts: "2026-04-04T15:35:31Z" },
  { name: "Circle K Autobahn", ext: "seed-ck-autobahn", lat: 53.372, lng: -6.28, petrolC: 191.9, dieselC: 214.9, ts: "2026-04-06T13:45:03Z" },

  { name: "Circle K Parkway West", ext: "seed-ck-pkw-west", lat: 53.338, lng: -6.39, petrolC: 191.9, dieselC: 217.9, ts: "2026-04-10T19:03:41Z" },
  { name: "Circle K Richmond", ext: "seed-ck-richmond", lat: 53.324, lng: -6.28, petrolC: 199.9, dieselC: 228.9, ts: "2026-03-24T00:00:00Z" },
  { name: "Circle K Sundrive", ext: "seed-ck-sundrive", lat: 53.317, lng: -6.293, petrolC: 199.9, dieselC: 228.9, ts: "2026-03-24T18:59:28Z" },
  { name: "Circle K Swords", ext: "seed-ck-swords", lat: 53.4597, lng: -6.2181, petrolC: null, dieselC: 228.9, ts: "2026-03-22T00:00:00Z", petrolEst: true },
  { name: "Circle K The Ward", ext: "seed-ck-ward", lat: 53.405, lng: -6.295, petrolC: 199.9, dieselC: 228.9, ts: "2026-03-21T00:00:00Z" },

  { name: "Certa 24/7", ext: "seed-certa-finglas", lat: 53.389, lng: -6.296, petrolC: 191.9, dieselC: 217.9, ts: "2026-04-13T13:16:12Z" },
  { name: "Certa 24hr", ext: "seed-certa-clarehall", lat: 53.402, lng: -6.17, petrolC: 191.9, dieselC: 217.9, ts: "2026-04-13T14:12:17Z" },
  { name: "Certa Liffey Valley", ext: "seed-certa-liffey", lat: 53.352, lng: -6.392, petrolC: 209.9, dieselC: 214.9, ts: "2026-04-06T15:57:24Z" },
  { name: "Circle K Omni Park", ext: "seed-ck-santry-omni", lat: 53.393, lng: -6.246, petrolC: 191.9, dieselC: 217.9, ts: "2026-04-12T17:23:38Z" },
  { name: "Circle K Castleknock", ext: "seed-ck-castleknock", lat: 53.378, lng: -6.35, petrolC: null, dieselC: 217.9, ts: "2026-04-09T22:49:12Z", petrolEst: true },

  { name: "Circle K Grosvenor", ext: "seed-ck-grosvenor", lat: 53.314, lng: -6.27, petrolC: 189.9, dieselC: 212.9, ts: "2026-04-01T14:08:27Z" },
  { name: "Circle K Hartstown", ext: "seed-ck-hartstown", lat: 53.393, lng: -6.42, petrolC: 191.9, dieselC: null, ts: "2026-04-07T10:59:20Z", dieselEst: true },
  { name: "Circle K Kennelsfort", ext: "seed-ck-kennelsfort", lat: 53.335, lng: -6.36, petrolC: 191.9, dieselC: null, ts: "2026-04-03T20:46:59Z", dieselEst: true },
  { name: "Circle K Kilmainham", ext: "seed-ck-kilmainham", lat: 53.337, lng: -6.309, petrolC: 198.9, dieselC: 219.9, ts: "2026-04-04T15:45:22Z" },
  { name: "Circle K Malahide", ext: "seed-ck-malahide", lat: 53.451, lng: -6.154, petrolC: 176.8, dieselC: 173.8, ts: "2025-11-18T20:59:35Z" },

  { name: "Circle K Elm Park", ext: "seed-ck-elmpark", lat: 53.316, lng: -6.207, petrolC: 181.9, dieselC: 173.9, ts: "2024-08-02T00:00:00Z" },
  { name: "Circle K Express Ushers Quay", ext: "seed-ck-ushers", lat: 53.346, lng: -6.278, petrolC: 186.9, dieselC: 209.9, ts: "2026-03-26T00:00:00Z" },
  { name: "Circle K Finglas", ext: "seed-ck-finglas", lat: 53.389, lng: -6.296, petrolC: 191.9, dieselC: 217.9, ts: "2026-04-13T00:00:00Z" },
  { name: "Circle K Foxhall", ext: "seed-ck-foxhall", lat: 53.372, lng: -6.18, petrolC: 191.9, dieselC: 214.9, ts: "2026-04-02T00:00:00Z" },
  { name: "Circle K Glasnevin", ext: "seed-ck-glasnevin", lat: 53.372, lng: -6.28, petrolC: 191.9, dieselC: 217.9, ts: "2026-04-13T00:00:00Z" },

  { name: "Circle K Clontarf", ext: "seed-ck-clontarf", lat: 53.364, lng: -6.206, petrolC: 191.9, dieselC: 217.9, ts: "2026-04-10T14:44:13Z" },
  { name: "Circle K Coolmine", ext: "seed-ck-coolmine", lat: 53.405, lng: -6.395, petrolC: 184.9, dieselC: null, ts: "2026-03-29T17:14:04Z", dieselEst: true },
  { name: "Circle K Donaghmede", ext: "seed-ck-donaghmede", lat: 53.398, lng: -6.164, petrolC: 191, dieselC: 208.9, ts: "2026-04-12T11:21:03Z" },
  { name: "Circle K Dublin Airport", ext: "seed-ck-dub-airport", lat: 53.428, lng: -6.244, petrolC: 191.9, dieselC: 217.9, ts: "2026-04-12T15:48:31Z" },
  { name: "Circle K Dublin Port", ext: "seed-ck-dub-port", lat: 53.352, lng: -6.196, petrolC: 182.9, dieselC: 177.9, ts: "2024-06-03T23:29:34Z" },

  { name: "Circle K Ballymun", ext: "seed-ck-ballymun", lat: 53.397, lng: -6.264, petrolC: 194.9, dieselC: 217.9, ts: "2026-04-09T09:26:02Z" },
  { name: "Circle K Beaumont", ext: "seed-ck-beaumont", lat: 53.384, lng: -6.23, petrolC: 184.9, dieselC: 208.9, ts: "2026-03-25T00:00:00Z" },
  { name: "Circle K Belmont", ext: "seed-ck-belmont", lat: 53.35, lng: -6.26, petrolC: null, dieselC: 228.9, ts: "2026-03-23T00:00:00Z", petrolEst: true },
  { name: "Circle K Cabra", ext: "seed-ck-cabra", lat: 53.364, lng: -6.292, petrolC: 191.9, dieselC: 214.9, ts: "2026-04-02T00:00:00Z" },
  { name: "Circle K Clonshaugh", ext: "seed-ck-clonshaugh", lat: 53.404, lng: -6.17, petrolC: 191.9, dieselC: null, ts: "2026-04-12T00:00:00Z", dieselEst: true },

  { name: "Maxol Service Station Swords Road", ext: "seed-maxol-swords-rd", lat: 53.378, lng: -6.255, petrolC: 189.9, dieselC: 209.9, ts: "2026-03-26T00:00:00Z" },
  { name: "Maxol Service Station Turvey", ext: "seed-maxol-turvey", lat: 53.485, lng: -6.15, petrolC: 192.9, dieselC: 219.9, ts: "2026-04-09T00:00:00Z" },
  { name: "McKee Avenue Service Station", ext: "seed-mckee-ave", lat: 53.389, lng: -6.305, petrolC: 185.9, dieselC: 209.9, ts: "2026-03-25T00:00:00Z" },
  { name: "Merrion Gates Service Station", ext: "seed-merrion-gates", lat: 53.316, lng: -6.207, petrolC: 189.9, dieselC: 209.9, ts: "2026-03-19T00:00:00Z" },
  { name: "Mount Brown Service Station", ext: "seed-mount-brown", lat: 53.339, lng: -6.295, petrolC: 199.9, dieselC: 212.9, ts: "2026-04-07T00:00:00Z" },

  { name: "Circle K Westview", ext: "seed-ck-westview", lat: 53.345, lng: -6.26, petrolC: 199.9, dieselC: 217.9, ts: "2026-04-09T00:00:00Z" },
  { name: "Circle K Westway", ext: "seed-ck-westway", lat: 53.342, lng: -6.385, petrolC: 191.9, dieselC: 212.9, ts: "2026-04-05T00:00:00Z" },
  { name: "D4 Fuels", ext: "seed-d4-fuels", lat: 53.33, lng: -6.245, petrolC: null, dieselC: 206.9, ts: "2026-03-31T00:00:00Z", petrolEst: true },
  { name: "Dolphins Barn Service Station", ext: "seed-dolphins-barn", lat: 53.324, lng: -6.295, petrolC: 191.9, dieselC: 214.9, ts: "2026-04-04T00:00:00Z" },
  { name: "East Wall Service Station", ext: "seed-east-wall", lat: 53.354, lng: -6.228, petrolC: 189.9, dieselC: 206.9, ts: "2026-04-01T00:00:00Z" },

  { name: "Elm Park Service Station", ext: "seed-elm-park", lat: 53.316, lng: -6.207, petrolC: 191.9, dieselC: 228.9, ts: "2026-04-12T19:32:08Z" },
  { name: "Go 24 Express", ext: "seed-go-24-cabra", lat: 53.356, lng: -6.292, petrolC: 189.9, dieselC: 215.9, ts: "2026-04-12T14:16:40Z" },
  { name: "KCR Service Station", ext: "seed-kcr", lat: 53.309, lng: -6.295, petrolC: 189.9, dieselC: 215.9, ts: "2026-03-27T10:05:46Z" },
  { name: "Killester Service Station", ext: "seed-killester", lat: 53.373, lng: -6.18, petrolC: 192.8, dieselC: 217.8, ts: "2026-04-13T14:23:56Z" },
  { name: "Maxol - Richmond Road", ext: "seed-maxol-richmond-rd", lat: 53.361, lng: -6.245, petrolC: 169.9, dieselC: 169.9, ts: "2025-11-29T16:38:04Z" },

  { name: "Maxol Auto24 Sutton", ext: "seed-maxol-sutton", lat: 53.388, lng: -6.14, petrolC: 190.9, dieselC: 214.9, ts: "2026-04-02T20:57:06Z" },
  { name: "Maxol M3 Mulhuddart Services", ext: "seed-maxol-m3", lat: 53.418, lng: -6.42, petrolC: 194.9, dieselC: 219.9, ts: "2026-04-12T12:03:08Z" },
  { name: "Maxol Service Station Baldoyle", ext: "seed-maxol-baldoyle", lat: 53.392, lng: -6.14, petrolC: 171.9, dieselC: 166.9, ts: "2025-05-25T14:48:36Z" },
  { name: "Maxol Service Station Ballycoolin", ext: "seed-maxol-ballycoolin", lat: 53.418, lng: -6.38, petrolC: 189.9, dieselC: 219.9, ts: "2026-03-26T07:53:17Z" },
  { name: "Maxol Service Station Donabate", ext: "seed-maxol-donabate", lat: 53.485, lng: -6.15, petrolC: 177.9, dieselC: 176.9, ts: "2025-08-20T11:25:45Z" },

  { name: "Top Oil Kilbarrack Service Station", ext: "seed-top-kilbarrack", lat: 53.394, lng: -6.164, petrolC: 194.9, dieselC: 215.9, ts: "2026-04-07T20:49:23Z" },
  { name: "Top Oil Portmarnock Service Station", ext: "seed-top-portmarnock", lat: 53.42, lng: -6.14, petrolC: null, dieselC: 206.1, ts: "2026-03-10T21:53:05Z", petrolEst: true },
  { name: "Top Oil Raheny Service Station", ext: "seed-top-raheny", lat: 53.372, lng: -6.18, petrolC: 192.9, dieselC: 215.9, ts: "2026-04-02T20:46:28Z" },

  { name: "Circle K Martello", ext: "seed-ck-martello", lat: 53.36, lng: -6.2, petrolC: 191.9, dieselC: 214.9, ts: "2026-04-04T17:01:17Z" },
  { name: "Circle K Maypark", ext: "seed-ck-maypark", lat: 53.384, lng: -6.23, petrolC: 199.9, dieselC: 228.9, ts: "2026-03-20T13:22:26Z" },
  { name: "Circle K Mulhuddart", ext: "seed-ck-mulhuddart", lat: 53.405, lng: -6.395, petrolC: 191.9, dieselC: null, ts: "2026-04-08T10:39:21Z", dieselEst: true },
  { name: "Circle K Nevin", ext: "seed-ck-nevin", lat: 53.372, lng: -6.28, petrolC: 191.9, dieselC: 217.9, ts: "2026-04-09T09:31:39Z" },
  { name: "Circle K Parkway East", ext: "seed-ck-pkw-east", lat: 53.35, lng: -6.42, petrolC: 191.9, dieselC: 217.9, ts: "2026-04-10T19:03:07Z" },

  { name: "Maxol Service Station Harold's Cross", ext: "seed-maxol-harolds", lat: 53.32, lng: -6.27, petrolC: 186.9, dieselC: 206.9, ts: "2026-03-31T14:04:28Z" },
  { name: "Maxol Service Station Mespil Road", ext: "seed-maxol-mespil", lat: 53.334, lng: -6.245, petrolC: 191.9, dieselC: 215.9, ts: "2026-04-04T00:00:00Z" },
  { name: "Maxol Service Station Navan Road", ext: "seed-maxol-navan", lat: 53.378, lng: -6.35, petrolC: 192.8, dieselC: null, ts: "2026-03-20T00:00:00Z", dieselEst: true },
  { name: "Maxol Service Station Ringsend", ext: "seed-maxol-ringsend", lat: 53.34, lng: -6.22, petrolC: 194.9, dieselC: 199.9, ts: "2026-03-10T00:00:00Z" },
];

const DEF_P = 191.9;
const DEF_D = 217.9;

function eur(c) {
  return (c / 100).toFixed(3);
}

function noteFor(r, grade) {
  const estimated =
    (grade === "petrol" && r.petrolEst) || (grade === "diesel" && r.dieselEst);
  return estimated
    ? "Community snapshot Apr 2026 · estimated where source showed blank (---)"
    : "Community snapshot Apr 2026";
}

function resolve(r) {
  let p = r.petrolC;
  let d = r.dieselC;
  if (p == null) {
    if (d != null) p = Math.max(160, Math.round((d - 26) * 10) / 10);
    else p = DEF_P;
  }
  if (d == null) {
    if (p != null) d = Math.round((p + 26) * 10) / 10;
    else d = DEF_D;
  }
  return { p, d };
}

function esc(s) {
  return s.replace(/'/g, "''");
}

let sql = `-- =============================================================================
-- Community fuel prices — expanded snapshot (fuel prices .txt + Pick a Pump–style screenshots)
-- Green = petrol, black = diesel. c/L → EUR/L (÷ 100).
-- Rows marked "estimated" in note: source had --- for that grade; filled with typical regional values.
--
-- TABLES: public.station_updates AND public.price_reports (app enrichment uses price_reports only)
-- USER: ${USER}
--
-- Before re-run: DELETE FROM price_reports WHERE station_external_id LIKE 'seed-%';
--               DELETE FROM station_updates WHERE note ILIKE '%Community snapshot Apr 2026%';
-- =============================================================================

BEGIN;

`;

const su = [];
const pr = [];

for (const r of rows) {
  const { p, d } = resolve(r);
  const pc = eur(p);
  const dc = eur(d);
  const ts = r.ts;
  const nP = noteFor(r, "petrol");
  const nD = noteFor(r, "diesel");

  su.push(
    `  ('${USER}'::uuid, 'fuel', '${r.ext}', '${esc(r.name)}', ${r.lat}, ${r.lng}, ${pc}, '${esc(nP)}', 'petrol', '${ts}')`,
    `  ('${USER}'::uuid, 'fuel', '${r.ext}', '${esc(r.name)}', ${r.lat}, ${r.lng}, ${dc}, '${esc(nD)}', 'diesel', '${ts}')`
  );

  pr.push(
    `  ('${USER}'::uuid, '${r.ext}', '${esc(r.name)}', ${r.lat}, ${r.lng}, 'fuel', 'petrol', ${pc}, 'EUR/L', NULL, 'submitted', '${ts}')`,
    `  ('${USER}'::uuid, '${r.ext}', '${esc(r.name)}', ${r.lat}, ${r.lng}, 'fuel', 'diesel', ${dc}, 'EUR/L', NULL, 'submitted', '${ts}')`
  );
}

sql += `INSERT INTO public.station_updates (
  user_id,
  station_type,
  station_external_id,
  station_name,
  lat,
  lng,
  new_price,
  note,
  fuel_grade,
  created_at
) VALUES
${su.join(",\n")}
;

INSERT INTO public.price_reports (
  reporter_id,
  station_external_id,
  station_name,
  lat,
  lng,
  station_type,
  fuel_grade,
  price,
  unit,
  photo_url,
  status,
  created_at
) VALUES
${pr.join(",\n")}
;

COMMIT;
`;

fs.writeFileSync(OUT, sql, "utf8");
console.log("Wrote", OUT, "(" + rows.length, "stations,", rows.length * 4, "rows across two INSERTs)");
