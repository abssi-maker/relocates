import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Cell, Neighbourhood, Spot } from "../lib/types";
import { decodeGeohash } from "../lib/geo";

type Props = {
  cells: Cell[];
  hoods?: Neighbourhood[];
  spots: Spot[];
  ranked: string[]; // spot ids in the agent's order
  selected?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
};

// Emerald ramp for taste affinity; only the upper half of the distribution is drawn so the map stays readable.
function fill(a: number) {
  const t = Math.max(0, Math.min(1, (a - 0.55) / 0.45));
  return { color: `rgb(${Math.round(15 + (1 - t) * 160)}, ${Math.round(118 + (1 - t) * 90)}, ${Math.round(110 + (1 - t) * 80)})`, opacity: 0.12 + t * 0.55 };
}

export function TasteMap({ cells, hoods = [], spots, ranked, selected, onSelect, className }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const pins = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: true, preferCanvas: true, attributionControl: true, scrollWheelZoom: false });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a> · Taste data: Qloo',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(m);
    const renderer = L.canvas({ padding: 0.3 });
    const layer = L.layerGroup().addTo(m);
    for (const c of cells) {
      if (c.a < 0.6) continue;
      const b = decodeGeohash(c.g);
      const f = fill(c.a);
      L.rectangle([[b.s, b.w], [b.n, b.e]], { renderer, stroke: false, fillColor: f.color, fillOpacity: f.opacity, interactive: false }).addTo(layer);
    }
    for (const h of hoods.slice(0, 6)) {
      for (const r of h.rings) {
        L.polygon(r.map(([x, y]) => [y, x] as [number, number]), { renderer, color: "#0F766E", weight: 1, opacity: 0.35, fill: false, dashArray: "3 4", interactive: false }).addTo(layer);
      }
    }
    pins.current = L.layerGroup().addTo(m);
    map.current = m;

    const focus = spots.filter((s) => ranked.includes(s.id));
    const pts = (focus.length ? focus : spots).map((s) => [s.lat, s.lon] as [number, number]);
    if (pts.length) m.fitBounds(L.latLngBounds(pts).pad(0.35), { maxZoom: 14 });
    else if (cells.length) m.fitBounds(L.latLngBounds(cells.map((c) => [c.lat, c.lon] as [number, number])));
    return () => {
      m.remove();
      map.current = null;
    };
    // The heat layer is static for a plan; pins update separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells]);

  useEffect(() => {
    const group = pins.current;
    if (!group) return;
    group.clearLayers();
    for (const s of spots) {
      const rank = ranked.indexOf(s.id);
      if (rank < 0) continue;
      const active = s.id === selected;
      const tone = s.label === "prime" ? "#D97706" : "#0F766E";
      const icon = L.divIcon({
        className: "",
        iconSize: [34, 44],
        iconAnchor: [17, 42],
        html: `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer">
          <div style="width:${active ? 34 : 30}px;height:${active ? 34 : 30}px;border-radius:999px;background:${active ? tone : "#fff"};color:${active ? "#fff" : tone};border:2px solid ${tone};display:flex;align-items:center;justify-content:center;font:600 13px Inter,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.18)">${rank + 1}</div>
          <div style="width:2px;height:10px;background:${tone}"></div></div>`,
      });
      L.marker([s.lat, s.lon], { icon, zIndexOffset: active ? 1000 : 0 })
        .on("click", () => onSelect?.(s.id))
        .bindTooltip(
          `<div style="font:500 12px Inter,sans-serif"><div style="font-weight:600">${s.name}</div><div style="color:${tone}">${s.label === "sweet" ? "Sweet spot" : "Prime"}</div><div style="color:#5f6368">affinity ${s.affinity.toFixed(2)} · busier than ${Math.round(s.busyRank * 100)}%</div></div>`,
          { direction: "top", offset: [0, -40], className: "spot-tip" },
        )
        .addTo(group);
    }
  }, [spots, ranked, selected, onSelect]);

  useEffect(() => {
    const s = spots.find((x) => x.id === selected);
    if (s && map.current) map.current.panTo([s.lat, s.lon], { animate: true });
  }, [selected, spots]);

  return <div ref={el} className={className} />;
}
