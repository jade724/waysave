# WaySave

A mobile-first Progressive Web App (PWA) that helps drivers in Ireland find and compare nearby fuel stations and EV charging points in real time.

---
## Features

- **Live fuel station map** — Nearby stations sourced via the Google Places API, rendered on a styled Google Map
- **EV charging points** — Real-time EV charger locations from the OpenChargeMap API, with connector type filtering (CCS, CHAdeMO, Type 2)
- **Community price reporting** — Users can submit current fuel prices; the latest submission is shown on the station detail screen
- **Smart sorting** — Sort stations by nearest, cheapest (weighted price + distance score), or fastest route
- **Filters** — Filter by max distance, fuel type (petrol / diesel / both), EV connector type, and price sensitivity
- **Favourites** — Save and manage favourite stations, backed by Supabase
- **Route planning** — View driving directions and alternative routes directly on the map via the Google Maps Directions API
- **Traffic layer** — Toggle real-time traffic overlay
- **Profile** — Edit display name, view saved favourites count
- **Settings** — Persistent preferences (sort order, max distance, default tab) saved to localStorage
- **Forgot password** — Email-based password reset via Supabase Auth
- **PWA** — Installable on Android and iOS home screens with offline service worker caching


---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7 |
| Styling | Tailwind CSS |
| Auth & Database | Supabase (Auth + Postgres) |
| Maps | Google Maps JavaScript API |
| EV Data | OpenChargeMap API |
| Hosting | Netlify (with Netlify Functions for API proxy) |
| PWA | vite-plugin-pwa |

---

### Repository layout

```
src/
├── api/                        # Data fetching
│   ├── fuelStations.ts         # Google Places fuel station loader
│   ├── googlePlaces.ts         # Google Places API wrapper
│   ├── openChargeMap.ts        # Open Charge Map (prefers Netlify proxy)
│   ├── favorites.ts            # Supabase favourites CRUD
│   ├── priceReports.ts         # Community price reports + optional pump photo (Storage)
│   └── enrichStationsWithPrices.ts
├── components/
│   ├── layout/                 # MobileFrame, BottomNav
│   ├── map/                    # GoogleMapBackground, DirectionsPanel
│   ├── screens/                # App screens
│   └── shared/
├── lib/                        # Auth, preferences, distance, logging
└── App.tsx                     # Screen router + global state

netlify/functions/
├── fetch-fuel-stations.ts      # Proxies Places Nearby Search + Text Search merge (API key on server)
└── fetch-openchargemap.ts      # Proxies Open Charge Map (OCM key on server)
```

---

## Getting Started 

### Prerequisites

- Node.js 18+
- A Supabase project
- A Google Maps API key (with Places API and Directions API enabled)
- An OpenChargeMap API key

### Environment variables

1. Copy the template and fill in values (never commit secrets):

   ```bash
   cp .env.example .env
   ```

2. **Local development (`npm run dev`)** — variables prefixed with `VITE_` are exposed to the browser. Use **`.env`** or **`.env.local`**.

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JS + Places client-side |
| `VITE_OCM_API_KEY` | *Optional* if you are **not** running `netlify dev`: allows direct Open Charge Map calls from the browser for EV data |

3. **Production (Netlify)** — set these in **Site configuration → Environment variables** (server-side; not bundled into the client):

| Variable | Purpose |
|----------|---------|
| `GOOGLE_MAPS_API_KEY` | Used by `fetch-fuel-stations` (same Google key as Places; keeps Places requests off the client CORS path). Can mirror `VITE_GOOGLE_MAPS_API_KEY` in the dashboard. |
| `OCM_API_KEY` | **Recommended** for EV charging: used by `fetch-openchargemap` so the Open Charge Map key does **not** need to ship in the frontend. The app tries this proxy first, then falls back to `VITE_OCM_API_KEY` for local Vite-only dev. |

Restrict API keys in Google Cloud and Open Charge Map dashboards (HTTP referrer / app limits) even when using `VITE_` keys.

### Supabase Tables

The app requires the following tables in your Supabase project:

**`profiles`**
```sql
create table profiles (
  id uuid references auth.users primary key,
  full_name text,
  created_at timestamptz default now(),
  preferences jsonb
);
```

**`favorites`**
```sql
create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  station_id text not null,
  station_name text not null,
  station_type text not null,
  station_lat float not null,
  station_lng float not null,
  created_at timestamptz default now(),
  unique(user_id, station_id)
);
```

**`price_reports` + Storage (`price-reports` bucket)**

Community fuel prices (and optional pump photos) are stored in **`price_reports`**. Photos go to Supabase Storage bucket **`price-reports`**; object paths must start with the signed-in user’s UUID (see the bundled SQL).

Run the full setup script once in the Supabase SQL editor:

**[`docs/price-reports-and-storage.sql`](docs/price-reports-and-storage.sql)**

That creates the table, RLS policies, and the storage bucket + upload/read policies. If `insert into storage.buckets` fails (permissions), create the **`price-reports`** bucket in the dashboard (public, ~8 MB, image MIME types) and apply only the **`storage.objects`** policy section from the same file.

**Incomplete table / “column station_name does not exist”:** an earlier partial `CREATE TABLE` can leave a wrong `price_reports` shape; `IF NOT EXISTS` then skips the full definition. Run **[`docs/price-reports-fix-partial-table.sql`](docs/price-reports-fix-partial-table.sql)** once (drops the table), then run **`price-reports-and-storage.sql`** again in full.

**Legacy `station_updates`:** older projects may still have this table; the app no longer writes to it. To keep historical rows visible in enrichment, copy them into `price_reports` (column mapping: e.g. `user_id` → `reporter_id`, `new_price` → `price`) or leave them as archive-only. The old helper script **`docs/supabase-station-updates.sql`** applies only if you still maintain `station_updates` outside this app.

**Price submit fails:** missing table/columns, RLS, or Storage policies are the usual causes. The app’s error toasts point at the docs above; check the browser console for the full Supabase error object.

### Install and Run

```bash
npm install
npm run dev
```

For local Netlify function testing (API proxies, functions on port 8888):

```bash
npm run dev:netlify
```

That runs `npx netlify-cli dev` (no global install). Alternatively: `npm install -g netlify-cli` then `netlify dev`.

### Build

```bash
npm run build
```

### Tests

Unit tests use [Vitest](https://vitest.dev/) (`src/**/*.test.ts`).

```bash
npm run test        # run once (also used in CI)
npm run test:watch  # watch mode during development
```

### Continuous integration

[GitHub Actions](.github/workflows/ci.yml) runs **ESLint**, **Vitest**, and **`npm run build`** on pushes and pull requests to `main`, `master`, and `develop`.

---

## Deployment

The app is configured to deploy on Netlify. Push to your connected branch and Netlify will:
1. Run `npm run build`
2. Publish the `dist/` folder
3. Deploy the `netlify/functions/` serverless functions

Configure **`GOOGLE_MAPS_API_KEY`** and **`OCM_API_KEY`** in Netlify (see [Environment variables](#environment-variables) above). Without `OCM_API_KEY`, production EV requests fall back only if `VITE_OCM_API_KEY` is present in the build (not ideal for hiding keys).

---

## Final Year Project

This application was built as a final year project. It demonstrates:

- Full-stack web development with React and Supabase
- Real-time geolocation and mapping with the Google Maps API
- Community-driven data (user-submitted fuel prices)
- Progressive Web App features (service worker, offline caching, home screen install)
- Responsive mobile-first UI design