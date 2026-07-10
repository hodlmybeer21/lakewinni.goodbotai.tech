# Winni Nav

A lightweight, no-backend web app for navigating Lake Winnipesaukee from your phone's GPS — like a Garmin HUD, but in Chrome.

Live: **https://lakewinni.goodbotai.tech**

## What it does

- **Live GPS dot** for your boat (phone GPS, ~3 m accuracy)
- **Speed** in knots + **heading** in degrees + **compass rose**
- **Public boat launches** — all 18+ NH launches with fees, parking notes, and restrictions
- **Major islands** (rough polygons, for orientation only)
- **Crowdsourced buoys** — tap a button, tap the map, log any buoy you see while boating. Saves to your phone's localStorage. Export as JSON anytime.
- **Crowdsourced hazards** — rocks, shoals, shallow areas, strong currents. Same workflow as buoys. Red triangle markers.
- **NH GRANIT bathymetry** — bathymetric contours (every 20 ft) and depth-band polygons from NH GRANIT/NHDES. **Off by default** with a permanent disclaimer banner while on. Cached locally so it only downloads once per device.
- **Trip logging** — every GPS run auto-records a dotted-line trail on the map. When you stop, you get a popup with distance, duration, max speed, and the chance to name it. Past trips stay on the map and can be exported as GPX (Google Earth, Garmin BaseCamp, etc.).
- **Marinas & fuel docks** — ~40 marinas on the lake with services (gas, diesel, pump-out, moorings, etc.), season, and a "Route to here" button that drops a pin into Google Maps for turn-by-turn directions from your launch. Each popup carries a reference citation.
- **Bridges & clearance** — low-clearance crossings (Wolfeboro Bay fixed truss, Lakeport drawbridge, etc.) with a **live clearance calculator** using the standard full-lake reference formula (`chart_clearance + 4.3 - lake_level`). Lake level is fetched from USGS 01080000 on boot, cached locally, with a manual override input always available in the popup.
- **POIs (restaurants / hotels / groceries by boat)** — 27 directory-seeded entries across the lake's main dock towns, plus crowdsourced additions. Tap 📍 → 🍽 POI to add one anywhere on the lake.
- **🧭 Shipped recommended routes** — captain-drawn channels baked into the app, fetched from `data/winni-routes.json` and cached locally. Rendered as **solid orange** lines (vs your finger-drawn routes which are **blue dashed**) so the two are visually distinct at a glance. Tap for label, distance, GPX export, or "Route to start" in Google Maps. Three routes shipped: (01) Moultonborough Bay → Wolfeboro Bay via The Broads, 69 waypoints / 16.3 nm · (02) Alton Bay → Wolfeboro Bay, 25 waypoints / 7.7 nm · (03) Wolfeboro Bay → Center Harbor via the east side, 22 waypoints / 14.8 nm.
- **🆘 Where-am-I rescue helper** — share lat/lng + nearest launch/marina with 911 / NH Marine Patrol in one tap.

## What it does NOT do (yet)

- **No official buoy data.** USCG ATON dataset is coastal-only — inland lake buoys on Winnipesaukee are maintained by NH Marine Patrol (~600 of them) and not published in machine-readable form. A printed cruising chart (sold at marinas) is the authoritative source. Buoy layer is user-contributed; populate it by boating and tapping.
- **No hardcoded hazards.** Earlier versions had hardcoded points (The Broads, Rocky Shoal, Five-Finger Point), but the coordinates were not authoritative and several were in the wrong place. Hazards are now crowdsourced the same way as buoys.
- **No no-wake zones.** Earlier versions included 50 zones from NH Admin Rules, but the polygon coordinates were inaccurate. Removed 2026-07-05. A crowdsourced no-wake layer would work the same way as buoys if you want one.
- **Not a navigation system.** Recreation aid. Always defer to official charts and visual markers.

## Files

```
winni-map/
├── index.html        ← The whole app (HTML + CSS + JS, single file, ~62 KB)
├── README.md         ← This file (user-facing)
├── AGENTS.md         ← Session handoff for future agents (project context)
└── vercel.json       ← Vercel static config
```

## How to use it

### Open on your phone
1. Open **https://lakewinni.goodbotai.tech** in Chrome or Safari
2. Tap **Start GPS** and grant location permission
3. Your dot will start updating on the map

### Local development
```bash
cd winni-map
python3 -m http.server 8765
# open http://localhost:8765
```

Note: HTTPS is required for `navigator.geolocation` in most browsers, so the hosted URL works better than localhost for testing GPS.

## Crowdsourcing buoys and hazards

Since official data isn't freely available, these layers are built by **you and your crew** while boating:

1. Tap **📍** (bottom-right) to enter add mode
2. Tap anywhere on the map where you see a buoy or hazard
3. Pick **Buoy** or **Hazard**
4. Pick its type/color
5. Add an optional note
6. Tap **Save**

Buoys are circles (red nun / green can / white / yellow), hazards are red triangles (rock / submerged / shallow / current / other). Both are stored in `localStorage` and persist across sessions on the same device.

**Export** — tap 💾 to download your data as JSON.

## Trip logging

Tap **Start GPS** to begin a trip. A teal dotted line trails behind your boat as you move. When you tap **Stop GPS**, the trip auto-saves and a popup asks for a name. Past trips are visible (toggleable via the Trips layer) and can be exported as GPX from the 🛶 Trips modal — individually or all-at-once.

## NH GRANIT bathymetry (reference)

Toggle **NH Bathymetry** in the layer panel. While on, a yellow disclaimer banner stays visible: *"NH Bathymetry (NH GRANIT/NHDES) — reference only, NOT for navigation. Verify on an authoritative cruising chart."* The NHDES license says exactly this — we surface it.

Data is fetched once from NH GRANIT/NHDES feature services and cached in localStorage for 30 days. The fetch is ~10 MB total.

## How it works (technical)

- **Leaflet 1.9.4** for the map (CDN)
- **OpenStreetMap** tiles (free, no API key)
- **`navigator.geolocation.watchPosition`** with `enableHighAccuracy: true` for GPS
- **`DeviceOrientationEvent`** for compass heading on iOS (`webkitCompassHeading`) and Android (`alpha`)
- **`localStorage`** for all crowdsourced data persistence
- **Single-file deploy** — no build step, no dependencies to install

## Data sources

- **Public launches:** [Roche Realty Lake Winnipesaukee launch list](https://rocherealty.com/boat-launches/), cross-checked with [lakewinnipesaukee.net](http://lakewinnipesaukee.net/boating/boat-launches-lakes-region-nh/)
- **NH GRANIT bathymetry:** [NH Department of Environmental Services](https://nhgeodata.unh.edu), via NH GRANIT. **Not for navigation** — the NHDES license explicitly says so. The app shows a disclaimer banner whenever this layer is on and repeats it in every popup.
- **Buoys & hazards:** Community-contributed. Authoritative source: a printed cruising chart for the lake + NH Marine Patrol buoys on the water.
- **Marinas:** A 2013 reference Lake Winnipesaukee marina directory + marina websites. Each popup carries a `source` citation.
- **POIs:** A 2014 restaurants-by-boat directory + a 2016 hotels-with-docking directory + community contributions. Stale data — verify hours before departing.
- **Lake level:** [USGS 01080000](https://waterdata.usgs.gov/monitoring-location/01080000/) (Lake Winnipesaukee at Weirs Beach). If the USGS feed is offline, call your nearest marina or town dock for today's reading.

## Roadmap

- [x] **v1.1** — Trip logging ✅ shipped 2026-07-05
- [x] **v1.2** — Hazards crowdsourced ✅ shipped 2026-07-05
- [x] **v1.3** — NH GRANIT bathymetry reference layer ✅ shipped 2026-07-05
- [x] **v1.4** — Bridge clearance markers + live clearance calculator (USGS lake level + standard full-lake reference formula) ✅ shipped 2026-07-07
- [x] **v1.5** — POI layer (restaurants / hotels / groceries) + marina directory expansion (directory-seeded) ✅ shipped 2026-07-07
- [x] **v1.6** — Shipped recommended routes (orange) under the existing Routes toggle; click for label + GPX export + "Route to start" via Google Maps. Three routes shipped as of 2026-07-10. ✅ shipped 2026-07-10
- [ ] **v1.7** — Weather overlay (NOAA station at Wolfeboro)
- [ ] **v2.0** — Multi-user live tracking (backend, friends can see each other)

## License

MIT — do whatever you want with it. Credit appreciated but not required.

## Author

Built 2026-07-05 by GoodBot for Tyler.