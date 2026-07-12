# AGENTS.md — Winni Nav project context

> **Read this first if you're a new agent picking up the Winni Nav project.**
> It is intentionally lean and project-specific. General OpenClaw behavior is in `/usr/lib/node_modules/openclaw/docs/AGENTS.md`.

## TL;DR

A single-file static web app (`index.html`, ~175 KB) that gives Winnipesaukee boaters a Garmin-HUD-style map with live GPS (pickable vessel icon: 9 options from speedboat to mermaid), crowdsourced buoys/hazards, NH GRANIT bathymetry (low-confidence reference), marina & fuel-dock locator, bridges & clearance (off by default), shipped recommended routes (cached locally from `data/winni-routes.json`), a "Where am I" rescue helper, and GPS trip logging with GPX export. No backend. Auto-deploys to Vercel on push to `main`.

## Identity

| Field    | Value                                                                |
| -------- | -------------------------------------------------------------------- |
| Project  | Winni Nav                                                            |
| Owner    | Tyler (`HodlMyBeer12`, telegram 8511611117)                          |
| Repo     | `github.com/hodlmybeer21/lakewinni.goodbotai.tech`                  |
| Host     | Vercel (auto-deploy on push to `main`)                               |
| URL      | https://lakewinni.goodbotai.tech                                    |
| Build    | None — single static `index.html`, served as-is                      |
| Stack    | Leaflet 1.9.4 (CDN) + OpenStreetMap tiles + vanilla JS + localStorage |

## Layout

```
winni-map/
├── index.html        ← ENTIRE APP. Single file, ~175 KB. HTML + CSS + JS.
├── README.md         ← User-facing documentation
├── AGENTS.md         ← This file (session handoff)
├── vercel.json       ← Vercel config (static, root = index.html)
├── .gitignore
├── .vercel/          ← Vercel project metadata (auto)
├── data/
│   └── winni-routes.json   ← Shipped recommended routes (orange on map)
└── scripts/          ← Build scripts (mostly archived; only `build-nowake-zones.py` remains but unused)
```

## What the app does (built 2026-07-05)

1. **Live GPS** — speed (kn), heading (°), compass rose, accuracy circle.
2. **Public boat launches** — 18+ NH launches with fees/notes, hardcoded `LAUNCHES` array in index.html.
3. **Islands** — hardcoded `ISLANDS` polygon array, gray fill.
4. **Crowdsourced buoys** — `localStorage.winniBuoys`. 4 types: red, green, white, yellow.
5. **Crowdsourced hazards** — `localStorage.winniHazards`. 5 types: rock, submerged, shallow, current, other. Red triangle markers. As of 2026-07-12 there's also a one-shot curated seed (`HAZARD_SEED_VERSION = '1'`, flag `winniHazardsSeeded`) that ships a single rock entry at The Witches coords (43.6030, -71.4012); entries added there follow the same crowdsourced CRUD pattern as user-added ones (delete link in popup, dedup by id).
6. **Crowdsourced depth soundings** — `localStorage.winniDepths`. **DORMANT in current prod** (modal button + layer checkbox removed in commit `4b9a260` but the helpers + storage are still in the code, ready to re-enable). See "Toggling depths on/off" below.
7. **NH GRANIT bathymetry** — `layers.bathyLines` + `layers.bathyBands`. Off by default. Loads from `nhgeodata.unh.edu` and `granit24a.sr.unh.edu` (CORS-friendly for the deployed origin). Cached in localStorage with 30-day TTL. Yellow disclaimer banner shown while layer is on; every popup repeats "NOT for navigation — verify on an authoritative cruising chart."
8. **Trip logging** — `localStorage.winniTrips`. Every GPS run auto-records a teal dotted trail behind the boat, throttled to ~3s or 5m of movement. On Stop GPS, prompts to name the trip. Past trips exportable as GPX.
9. **Bridges & clearance** — `layers.bridges` + `BRIDGES` array. Off by default (per AGENTS.md rule #1). Rotated-diamond icon with a red "low clearance" bar on top, suggesting respect for vertical clearance. Each popup carries a `source` citation, the typical clearance in feet, **and a live clearance calculator** that uses the standard full-lake reference formula (`chart_clearance + 4.3 - lake_level`). Lake level is fetched from USGS 01080000 on boot (graceful fallback if offline), cached in `localStorage.winniLakeLevel`, with a manual override input always available in the popup.

   Two categories of crossings live in `BRIDGES[]`:

   - **Public roadway bridges** (Wolfeboro Bay truss, Lakeport Draw) — verifiable clearance from NH DOT inventory or `LAUNCHES[]` notes.
   - **Bridged-island private/association bridges** (Long Island, Black Cat Island, Governor's Island, Oak Island, Worcester Island, Christmas/Plummers Island, Birch–Steamboat "Rainbow Bridge") — Lake Winnipesaukee has ~6 famous bridged islands where boats pass UNDER private bridges. Most clearances are NOT publicly published. These ship with `clearance_ft: null` and a yellow "⚠ Clearance unverified" banner in the popup; the live clearance calculator is hidden for them. Coordinates are derived from nearby island-property addresses and flagged via `coords_note` ("Approximate — verify on chart before relying").

   Future expansion: add published page references to upgrade bridged-island entries from `null` clearance to verified numbers, and replace approximate coords with verified locations when available. Never ship an entry with an empty `source` field.
10. **🆘 Where-am-I rescue helper** — `showRescueModal()`. Tapping the new 🆘 action-bar button opens a modal with the current lat/lng (copyable), nearest public launch via haversine on the `LAUNCHES[]` array, nearest marina via haversine on the `MARINAS[]` array, a pre-formatted SMS-ready message, and one-tap `tel:` links to 911 and NH Marine Patrol (603-293-2037). Falls back to lake center if GPS not acquired, falls back to select-and-copy if the Clipboard API is blocked.
11. **POIs (restaurants / hotels / groceries / historic sites)** — `layers.pois` + `POI_TYPES` (restaurant / hotel / grocery / historical) + crowdsourced `localStorage.winniPoisV1`. Follows the buoys/hazards CRUD pattern. Seeded on first load from a 2014 restaurants + 2016 hotels reference directory plus a 2026-07-12 Historic Landmarks list, using the nearest `LAUNCHES[]` coords for each reference entry; seed is one-shot (flag `winniPoisV1Seeded`). User-added POIs carry their own `source` field for verification.

    As of v5 (2026-07-12) the POI layer is **split into 4 per-category sub-toggles** in the Layers panel: Restaurants / Hotels / Groceries / Historic. The single "POIs" master toggle still exists for visual sync — when any sub is on, the master displays as checked. Per-category sub-groups (`layers.poisRestaurants` / `poisHotels` / `poisGroceries` / `poisHistorical`) carry the actual markers, so toggling a sub is instant. The `cat` field on each `storedPoi` is the join key.

    Historic Landmarks seed is curated-only (Tyler reference list 2026-07-12); entries are NOT for navigation. Their note typically is the historical/curiosity context, with a `source` citation that mentions a published primary ref (NH Division of Parks, Lake Winnipesaukee Historical Society, NRHP, etc.) for verification.

    v1 seed was 27 entries; v2 added The Dive at Smalls Cove Sandbar (West Alton) with bad coords (~5 nm north of true location); v3 fixed The Dive coords to (43.4700, -71.2600) per Tyler reference list 2026-07-10 item #47; v4 reverted to West Alton shoreline area (43.5468, -71.2935) after Tyler supplied Google Maps reference 2026-07-12; v5 added the 10-entry Historic Landmarks category. Approximate coords are still approximate — see rule #13 for the protocol on replacing them. Tap 📍 → 🍽 POI to add a new one anywhere on the lake.

## Workflow for adding a new layer (the pattern)

When Tyler asks for a new crowdsourced layer (buoys, hazards, depth soundings all followed this exact pattern):

1. **State + storage** — `storedXxx = JSON.parse(localStorage.getItem('winniXxx') || '[]')` near the other `storedXxx` declarations.
2. **Layer object** — add `xxx: null` to the `layers` object; initialize with `L.layerGroup()` in `initMap()`; populate from storage.
3. **CRUD block** — `addXxxToLayer`, `saveXxx`, `addXxx`, `deleteXxx` (window-exposed), `rebuildXxxLayer`. Mirror the hazard code; it's the cleanest example.
4. **Type constants** — `XXX_TYPES` object near `BUOY_TYPES`/`HAZARD_TYPES` (color, label).
5. **Modal flow** — if it goes through the 📍 modal, add a button to `showAddChoiceModal`'s actions row, a `showXxxModal()` function, and a `confirmXxx()` handler.
6. **Layer toggle** — add `<label class="layer-toggle">` to the layer panel and a `change` listener in `wireUI`.
7. **Export** — include in the JSON payload of `exportBtn`.
8. **Info modal** — bump the saved-locally counter.
9. **Marker CSS** — if it needs a custom divIcon, add a class to the `.buoy-marker` / `.hazard-marker` / `.depth-marker` block in the `<style>` section.

## Critical rules — do not violate

These were all hard-won. Don't re-make any of these mistakes.

1. **NEVER add hardcoded geographic data unless it comes from a named, authoritative source AND is clearly labeled "low-confidence reference".** Tyler has removed four such layers over the course of building this app because they were inaccurate:
   - Duck-shaped lake outline polygon (commit `1b5f7c1`)
   - NH GRANIT shoreline overlay (commit `e0a0a39`)
   - No-wake zones (50 polygons, commit `8317396`)
   - Static hazards (Three Broads / Rocky Shoal / Five-Finger Point, commit `4b9a260`'s parent)

   **If a data source isn't authoritative for navigation, it goes behind a toggle that's off by default with a permanent in-app disclaimer.** NH GRANIT bathymetry is the only acceptable exception, and only because the NHDES license explicitly says "SHOULD NOT be used for navigational purposes" — we surface that exact wording.

2. **Always defer to a printed cruising chart for navigation.** The app's persistent tagline: "Recreation aid — not for primary navigation."

3. **JS parse check before commit.** After editing `index.html`, run:
   ```bash
   node -e "const html=require('fs').readFileSync('index.html','utf8');const m=html.match(/<script>([\s\S]*?)<\/script>/g);const code=m[m.length-1].replace(/^<script>/,'').replace(/<\/script>$/,'');try{new Function(code);console.log('JS OK,',code.length,'bytes')}catch(e){console.log('ERR:',e.message)}"
   ```
   Must print `JS OK, ...`. If it prints `ERR: ...`, do not push.

4. **Vercel can take a moment to redeploy after a force-push.** If `git reset --hard <old-sha> && git push --force-with-lease` doesn't appear to redeploy, do a no-op empty commit (`git commit --allow-empty -m "Re-trigger Vercel deploy"`) and push. Also check `x-vercel-cache: MISS` and `age: 0` on a cache-busted `curl` to confirm fresh deploy.

5. **NH GRANIT endpoints require the deployed origin for CORS.** They `vary: Origin` and `access-control-allow-origin` returns the request origin. If Tyler ever changes the deploy URL, the bathymetry fetch will fail with a CORS error. CORS test:
   ```bash
   curl -sI -H 'Origin: https://lakewinni.goodbotai.tech' \
     'https://nhgeodata.unh.edu/hosting/rest/services/Hosted/EDP_Bathymetry_Lakes/FeatureServer/0/query?where=1=1&f=json&returnCountOnly=true'
   ```
   Should return HTTP 200 with `access-control-allow-origin: https://lakewinni.goodbotai.tech`.

## Toggling depths on/off

The depth soundings UI (modal button + layer toggle) was removed in commit `4b9a260` per Tyler's request, but the underlying machinery stayed in place:

- `layers.depths` layer group — initialized in `initMap`, populated from `storedDepths`
- `HAZARD_TYPES`-style depth marker icon (`depthColor`, `depthIcon`, `.depth-marker` CSS)
- CRUD: `addDepthToLayer`, `addDepth`, `deleteDepth`, `rebuildDepthLayer`
- `showDepthModal`, `confirmDepth` modal flow
- Export includes `depths` array

To re-enable the UI: add `<button class="btn btn-secondary" onclick="showDepthModal()">📏 Depth</button>` to `showAddChoiceModal`'s actions, and `<label class="layer-toggle"><input type="checkbox" id="layerDepths" /> Depth soundings (yours)</label>` to the layer panel. Also re-attach the `layerDepths` change listener and the `confirmDepth` "make layer visible" code in the save handler.

## Working with Vercel + the force-push gotcha

This has bitten us once. If you need to roll back to an earlier commit:

```bash
cd /root/.openclaw/workspace/projects/winni-map
git reset --hard <old-sha>
git push --force-with-lease origin main
# Then verify Vercel picked it up:
curl -sI "https://lakewinni.goodbotai.tech/?cb=$(date +%s)" | grep -i age
# Should show 'age: 0' and 'x-vercel-cache: MISS'.
# If not, do an empty commit to wake Vercel up:
git commit --allow-empty -m "Re-trigger Vercel deploy"
git push origin main
```

## Useful commands

```bash
# Validate JS in index.html
cd /root/.openclaw/workspace/projects/winni-map
node -e "const html=require('fs').readFileSync('index.html','utf8');const m=html.match(/<script>([\s\S]*?)<\/script>/g);const code=m[m.length-1].replace(/^<script>/,'').replace(/<\/script>$/,'');try{new Function(code);console.log('JS OK,',code.length,'bytes')}catch(e){console.log('ERR:',e.message)}"

# Verify live deploy is fresh + serves new code
curl -sI "https://lakewinni.goodbotai.tech/?cb=$(date +%s)" | grep -iE "age|x-vercel-cache"
curl -s  "https://lakewinni.goodbotai.tech/?cb=$(date +%s)" | grep -c "loadNHGranitBathy"

# Test NH GRANIT CORS
curl -sI -H 'Origin: https://lakewinni.goodbotai.tech' \
  'https://nhgeodata.unh.edu/hosting/rest/services/Hosted/EDP_Bathymetry_Lakes/FeatureServer/0/query?where=1=1&f=json&returnCountOnly=true'

# Check git state
cd /root/.openclaw/workspace/projects/winni-map && git status --short && git log --oneline -5
```

## Open items / pending decisions

- **VT double-post cron fix** — Tyler hasn't given go-ahead.
- **No-wake zones** — removed 2026-07-05 (was inaccurate). Could come back as crowdsourced like buoys/hazards if Tyler wants them, but not requested yet.
- **Lake shoreline overlay** — removed 2026-07-05. Same: could be crowdsourced if Tyler wants it back.
- **Duck-shaped lake outline** — removed. Permanent dead. Don't recreate it.
- **Depth soundings UI** — currently dormant. Re-enable on request.

## Recent commit history (for context)

- `winni-historic-landmark-category-v1` — Add POI category `historical` (4th POI_TYPES entry, bronze icon) + 10 curated Historic Landmarks (Tyler reference list 2026-07-12, NRHP/LWHS/NEHS citations). Split POI Layers toggle into 4 per-category sub-toggles (Restaurants / Hotels / Groceries / Historic). Add one-shot curated hazard seed (HAZARD_SEED_VERSION) shipping The Witches rock marker. POI_SEED_VERSION 4 → 5.
- `winni-shipped-routes-v1` — Add shipped recommended routes (data/winni-routes.json + separate localStorage key + orange solid render + GPX export + "Route to start" via Google Maps). Route 01: Moultonborough Bay → Wolfeboro Bay via The Broads (69 waypoints, captain-drawn).

- `d925c6b` — Add Pier 19 (Tuftonboro) to marinas & fuel-dock layer (225 GJW Hwy, gas + groceries)
- `a85040e` — Collapse layers panel into a chip by default
- `2f3ec47` — Add Where-am-I rescue helper + Bridges & clearance layer
- `5cacb66` — Merge feature/compact-hud (compact bottom-left HUD card)
- `8a8d43e` — Compact bottom-left HUD: cut height ~50% while keeping all data
- `63c2b67` — Merge feature/fix-overlap (HUD compass + zoom controls)
- `d0d4ff9` — Fix HUD compass / Leaflet zoom controls overlapping content
- `5a3a21d` — Empty-commit wake after rollback to ce4d266 (reverts the seed-buoys scaffold)
- `080923d` — Document seeded-buoy infrastructure in AGENTS.md (ROLLED BACK in 5a3a21d; retain commit for reflog)
- `d5ddb29` — Merge feature/seeded-mp-buoys (reverted in 5a3a21d)
- `b878cd3` — Add NH MP reference (seed) buoy layer scaffold (reverted in 5a3a21d)
- `592134c` — empty commit to retrigger Vercel deploy after force-rollback
- `4b9a260` — Remove depth soundings option (kept layer + helpers dormant)
- `a75ae46` — Add NH GRANIT bathymetry + depth soundings
- `03af400` — Trip logging: live trail, auto-save, GPX export
- `7329681` — Convert hazards from static layer to crowdsourced
- `e624e44` — Fix hazard locations (Five-Finger Point was on Mount Major, not in lake)
- `1b5f7c1` — Remove duck-shaped lake outline polygon
- `e0a0a39` — Remove NH GRANIT lake shoreline overlay
- `8317396` — Remove no-wake zones layer
- `fc97b65` — Initial release: Winni Nav v1

## Known gotchas that will bite you

1. **`haversine()` is used by trip append logic and called from `onPos()` at runtime, but declared AFTER `onPos()` in source order.** It works because it's a function declaration (hoists). Don't refactor it to a `const = () =>` arrow or it'll break.

2. **`appendTripPoint` is called from `onPos`, which is invoked by the GPS watcher.** Same hoisting rule applies to any helper called from `onPos`.

3. **Layers panel is collapsed by default with header/body split.** The DOM has `<div id="layers" class="hud collapsed">` containing `#layers-header` (the chip) and `#layers-body` (the body of checkboxes). The state is persisted in `localStorage.winniLayersOpen` (`'1'` / `'0'`); default-on-first-visit is collapsed. If you add a new layer checkbox, append it inside `#layers-body`, never outside — the chip-side header is click-only. Outside-tap close and Escape close are global listeners on `document`; if you add a new modal-style overlay that lives outside `#layers`, make sure it suppresses propagation on its own click or the panel will close mid-interaction.

4. **Leaflet `setRotationAngle`** is used for the user marker heading. It's a `leaflet-rotatedmarker`-style API; if you swap Leaflet versions, this might break. Pin Leaflet to 1.9.4 (already pinned via CDN).

4. **`modal` CSS class** — adding `.show` shows it; removing hides. The depth-soundings modal prompt reuses the same modal element. Don't introduce a second modal.

5. **`onMapClick` only fires when `buoyAddMode === true`**, which is the 📍-button-toggled mode. So adding a non-buoy layer through a different button (e.g. an "add hazard here" map-click) requires entering buoy-add mode first, or refactoring.

6. **Trip popup's "View" button calls `viewTripOnMap(id)` which fits bounds and dismisses the modal.** If you add more layers to trips (e.g. waypoints), the bounds-fit logic may need updating.

7. **The Trips layer uses `lineCap: 'round'` + `dashArray: '6, 6'`** for the dotted-line aesthetic. Don't change to solid.

8. **localStorage quota is ~5 MB per origin.** NH GRANIT bathymetry GeoJSON is ~10 MB total, so we cache lines (3.7 MB) and bands (6.5 MB) separately in localStorage. If the quota is exceeded the cache write fails silently and re-fetches next session.

9. **Shipped recommended routes (`data/winni-routes.json`) are SEPARATE from user finger-drawn routes.** Two storage keys, two layer functions, two modal functions:
   - `winniRoutes` + `addRouteToLayer` + `openRouteActionsModal` = user finger-drawn (blue dashed, editable, deletable)
   - `winniShippedRoutesV1` + `addShippedRouteToLayer` + `openShippedRouteModal` = shipped recommendations (orange solid, NOT editable, GPX-exportable, "Route to start" via Google Maps)
   - Both render into the SAME `layers.routes` group and share the same `#layerRoutes` toggle. Don't split them into two toggles — the visual distinction (orange solid vs blue dashed) is enough.
   - **No endpoint markers.** Shipped routes used to render small green (start) and red (end) circleMarkers, but Tyler removed them on 2026-07-10 because they competed visually with the ATON buoys (red nun / green can are standard navigation markers — green dots on the map = "keep to port," not "your route starts here"). Routes are now line-only. The tap-popup still shows start/finish info for routes that need it. `route._startMarker` and `route._endMarker` are kept as `null` so the cache-removal path in `seedShippedRoutesIfNeeded` stays null-safe. The `_isLoop` flag is still set for any future use.
   - The shipped file is fetched on boot (`seedShippedRoutesIfNeeded`), cached with version flag `winniShippedRoutesSeedV1` matching `SHIPPED_ROUTES_VERSION`. Bump the version constant when the file shape changes (e.g. new required fields).
   - The seed has no inline fallback (unlike buoys) because routes are hand-authored and a stale cache is better than a blank layer. On fetch failure, the cache renders and the version flag is NOT updated, so next visit retries.
   - `computeRouteDistanceNm()` and `escapeHtml()` are hoisted function declarations shared by the modal + GPX export. Don't arrowify them — `openShippedRouteModal` is called from a Leaflet click handler that may execute before all `const` arrow initializers in the file have run.

10. **All data layers start OFF on first visit (as of 2026-07-10).** Tyler wants first-time visitors to experience the layers one at a time. Don't re-add `checked` attributes to layer checkboxes or `.addTo(map)` calls in `initMap()`. Programmatic `checked = true` + `addTo(map)` IS allowed in user-triggered paths (saving a buoy, viewing a trip, entering route-draw mode, etc.) — the rule is only about the initial empty-map state. If you add a new layer, default it OFF. Only the base map (OSM tiles) and the always-on island orientation polygons render at boot.

11. **`seedShippedRoutesIfNeeded()` MUST be called AFTER `initMap()` runs.** The cache-render path inside the function does `line.addTo(layers.routes)` synchronously, which throws if `layers.routes` is undefined. `initMap()` is what creates `layers.routes`. The function is currently invoked from inside the `DOMContentLoaded` handler in `wireUI()`'s neighborhood (search for `seedShippedRoutesIfNeeded();` near the bottom of the script). Do NOT move the call back to script-load time (before `DOMContentLoaded`) — it will break visit 2+ of the app with the symptom "routes appear on first visit, vanish on every subsequent visit". The function also has an internal guard (`if (!layers || !layers.routes) return;`) as a defense-in-depth check, but the proper fix is to keep the call after `initMap()`.

12. **Vessel icon picker (`VESSEL_ICONS` array, key `winniVesselIcon`) ships 9 emoji-based vessel icons.** Default is `speedboat`. The icon is used as the user's GPS marker (`layers.user`) and to color the accuracy circle. On first-ever Start GPS tap, the picker is shown automatically (chained into startTracking via `_vesselPickerThenStartTracking`). Subsequent changes are always available via the 🚤 button in the action bar (`#vesselIconBtn`), which mirrors the current vessel emoji. To add a new icon: append to `VESSEL_ICONS` with `{id, emoji, label, color}`. Don't change `DEFAULT_VESSEL_ID` without a migration; users who already have a saved choice are unaffected. Don't use raster/SVG icons in the picker — emoji keeps the payload tiny (~50 bytes per icon vs ~2 KB for SVG).

13. **POIs with non-authoritative coordinates (e.g. floating businesses, seasonal barge bars like The Dive at Smalls Cove Sandbar) are an exception to rule #1, but only via the POI seed path.** Specifically: the entity may go in `POI_SEED` even when coords aren't from an authoritative source, IF (a) `cat` is `restaurant` / `hotel` / `grocery` (never `buoy`, `hazard`, or `depth`), (b) the `source` field cites at least the operator's own website or a verifiable social page, (c) the `note` field explicitly says "coordinates approximate" + a reason (e.g. "anchor moves with the barge" or "verify on chart"), and (d) the entry is bucketed in a section comment like `// ---- West Alton (Smalls Cove Sandbar, ~lat -lng) ----` so the approximate nature is visible in source. Bump `POI_SEED_VERSION` on every addition. Floating businesses and seasonal pop-ups have no fixed location, so don't try to pin them precisely — flag them and move on. If you can verify the actual anchor location later, you can replace the entry (do NOT just edit the seed and re-seed; bump the version so existing users get the fix).

## Contact

If you break something, Tyler prefers you:
1. Fix it directly if the fix is obvious
2. Otherwise, ask before making a destructive change (especially anything that touches `localStorage` keys or removes geographic data)

Tyler's Telegram: 8511611117. He communicates mostly by voice message (transcripts are auto-generated and posted as text) — make sure to read the conversation context blocks for the actual request, not just the most recent message.