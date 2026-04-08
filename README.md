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

  
```

src/
├── api/                        # Data fetching
│   ├── fuelStations.ts         # Google Places fuel station loader
│   ├── googlePlaces.ts         # Google Places API wrapper
│   ├── openChargeMap.ts        # OpenChargeMap EV API wrapper
│   ├── favorites.ts            # Supabase favourites CRUD
│   ├── stationUpdates.ts       # Community price update submissions
│   └── enrichStationsWithPrices.ts  # Enriches stations with community prices
├── components/
│   ├── layout/                 # MobileFrame, BottomNav
│   ├── map/                    # GoogleMapBackground, DirectionsPanel
│   ├── screens/                # All app screens
│   └── shared/                 # StationCard and other reusable components
├── lib/
│   ├── authContext.tsx          # Supabase auth context + profile
│   ├── preferences.ts          # User preferences type + localStorage helpers
│   ├── supabaseClient.ts       # Supabase client
│   └── distance.ts             # Haversine distance calculation
└── App.tsx                     # Screen router + global state
netlify/
└── functions/
    └── fetch-fuel-stations.ts  # Serverless proxy for Google Places API
```

---

## Getting Started 

### Prerequisites

- Node.js 18+
- A Supabase project
- A Google Maps API key (with Places API and Directions API enabled)
- An OpenChargeMap API key

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_OCM_API_KEY=your_opencharge_map_api_key
```
For the Netlify function, set `GOOGLE_MAPS_API_KEY` in your Netlify environment variables dashboard.

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

**`station_updates`**
```sql
create table station_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  station_name text not null,
  new_price float not null,
  note text,
  created_at timestamptz default now()
);
```

### Install and Run

```bash
npm install
npm run dev
```

For local Netlify function testing:

```bash
npm install -g netlify-cli
netlify dev
```

### Build

```bash
npm run build
```

---

## Deployment

The app is configured to deploy on Netlify. Push to your connected branch and Netlify will:
1. Run `npm run build`
2. Publish the `dist/` folder
3. Deploy the `netlify/functions/` serverless functions

---

## Final Year Project

This application was built as a final year project. It demonstrates:

- Full-stack web development with React and Supabase
- Real-time geolocation and mapping with the Google Maps API
- Community-driven data (user-submitted fuel prices)
- Progressive Web App features (service worker, offline caching, home screen install)
- Responsive mobile-first UI design