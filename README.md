# Relocates

**Open where your customers already are.** Relocates helps online (Shopify / DTC) brands open their first pop-up or store. It reads the brand's store, uses Qloo's taste graph to find the blocks of a city where the brand's audience taste already lives, and lines up the local partners, outreach and launch kit to open there.

Live app: https://relocates.io · Demo account: `judge@relocates.io` / `Relocates-Judge-2026` (or click **Use demo account** on the sign-in page).

## What it does

1. **Connect store.** Reads the public Shopify catalog (`/products.json`) or site metadata. Gemini identifies the brand; Qloo `/search` matches it (or look-alike brands when the brand isn't in Qloo), and the founder confirms.
2. **Your customer, per Qloo.** Age and gender skew (`urn:demographics`) and brand-level taste tags (`urn:tag` with `filter.parents.types=urn:entity:brand`).
3. **Where: the Scout agent.** A Gemini function-calling agent works through Qloo tools:
   - `map_taste`: the Qloo heatmap (`filter.type=urn:heatmap`, a few thousand geohash cells) plus a neighbourhood ranking (`output.heatmap.boundary=urn:entity:locality`, with polygons). From these it derives **sweet spots** (top-decile taste, outside the busiest decile) and **prime** spots (top decile on both).
   - `scan_block`: Qloo places around each candidate spot (`urn:entity:place`, `filter.location` + radius, `feature.explainability`), classified into venues with event space, cafés and restaurants, and hotels.
   - `find_collab_brands` / `find_launch_artists`: Qloo brand affinity, and artist affinity with a city location signal.
   - `submit_plan`: ranks 3 spots and picks partners. The server rejects any plan that cites ids the tools never returned.
4. **Who.** Partner cards by role (Host it, Co-promote, Guest traffic, Collab drop, Launch night), each with its Qloo affinity, the agent's reason, and the address, website and phone from Qloo.
5. **Launch kit.** Outreach emails (Gemini), a launch poster (Gemini image), a 30-second in-store track (Lyria, styled from the Qloo artist tags; artist names are never sent to the model), and an opening-week plan.
6. **Tracker.** Outreach pipeline (To contact → Sent → Replied → Booked), plus read-only share links.

## Architecture

- **Frontend:** React + Vite + Tailwind, Leaflet with CARTO basemap tiles.
- **Auth and data:** Supabase (email auth, Postgres with row-level security, Storage for kit media).
- **Netlify Functions** (`netlify/functions`): Qloo calls (`store`, `profile`, `city`, `tools`, `block`) and `share`.
- **Netlify Edge Functions** (`netlify/edge-functions`): Gemini calls (`think` is one agent step; `write`; `media`). These run at the edge so long generations aren't cut off by the serverless timeout. The browser drives the agent loop (`src/lib/scout.ts`): think → run tools → think … until `submit_plan`.

## Run locally

```bash
cp .env.example .env          # fill in Qloo, Gemini and Supabase keys
# Supabase: run supabase/schema.sql in the SQL editor
npm install
npx netlify-cli dev           # serves the app, functions and edge functions
npx tsx scripts/try-flow.ts glossier.com "New York City"   # backend flow from the terminal
```

Environment variables: `QLOO_API_URL`, `QLOO_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## License

MIT, see [LICENSE](LICENSE).
