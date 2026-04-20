import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Leg } from "@/lib/types";
import type { Crossing } from "@/lib/congestion";
import { ZONES } from "@/lib/congestion-zones";
import { formatSEK } from "@/lib/cost";

const ROUTE_COLORS = [
  "oklch(0.78 0.18 145)",
  "oklch(0.72 0.18 220)",
  "oklch(0.78 0.16 60)",
  "oklch(0.7 0.2 320)",
];

function resolveColor(c: string): string {
  const el = document.createElement("div");
  el.style.color = c;
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color;
  document.body.removeChild(el);
  return computed || "#22c55e";
}

type Props = {
  legs: Leg[];
  legCrossings: Crossing[][];
};

export function TripMap({ legs, legCrossings }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [59.3293, 18.0686],
      zoom: 6,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // Static congestion control point markers — informational only.
    const cpColor = resolveColor("oklch(0.78 0.16 60)");
    ZONES.forEach((zone) => {
      zone.controlPoints.forEach((cp) => {
        L.circleMarker([cp.point.lat, cp.point.lng], {
          radius: 3,
          color: cpColor,
          weight: 1,
          fillColor: cpColor,
          fillOpacity: 0.5,
          interactive: false,
        }).addTo(map);
      });
    });

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const allBounds: L.LatLngExpression[] = [];

    legs.forEach((leg, idx) => {
      const color = resolveColor(ROUTE_COLORS[idx % ROUTE_COLORS.length]);
      if (leg.route?.coordinates.length) {
        const latlngs = leg.route.coordinates.map(
          (c) => [c.lat, c.lng] as L.LatLngExpression,
        );
        L.polyline(latlngs, { color, weight: 5, opacity: 0.85 }).addTo(layer);
        latlngs.forEach((l) => allBounds.push(l));
      }
      const stops = [leg.origin, ...leg.waypoints, leg.destination];
      stops.forEach((stop) => {
        if (!stop.point) return;
        const html = `<div style="
          width:18px;height:18px;border-radius:9999px;
          background:${color};border:3px solid white;
          box-shadow:0 2px 6px rgba(0,0,0,0.4);
        "></div>`;
        L.marker([stop.point.lat, stop.point.lng], {
          icon: L.divIcon({ html, className: "", iconSize: [18, 18], iconAnchor: [9, 9] }),
        }).addTo(layer);
        allBounds.push([stop.point.lat, stop.point.lng]);
      });

      // Congestion crossing markers for this leg.
      const crossings = legCrossings[idx] ?? [];
      crossings.forEach((c) => {
        const html = `<div style="
          width:24px;height:24px;border-radius:6px;
          background:#f59e0b;border:2px solid white;
          color:#1c1917;font-size:11px;font-weight:700;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,0.5);
        ">${c.charge}</div>`;
        L.marker([c.point.lat, c.point.lng], {
          icon: L.divIcon({ html, className: "", iconSize: [24, 24], iconAnchor: [12, 12] }),
        })
          .addTo(layer)
          .bindPopup(
            `<strong>${c.city}</strong><br/>${c.station}<br/>${c.direction} · ${c.time.toLocaleTimeString(
              "sv-SE",
              { hour: "2-digit", minute: "2-digit" },
            )}<br/><strong>${formatSEK(c.charge)}</strong>`,
          );
      });
    });

    if (allBounds.length > 0) {
      const bounds = L.latLngBounds(allBounds);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [legs, legCrossings]);

  return <div ref={containerRef} className="h-full w-full rounded-2xl overflow-hidden" />;
}
