import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Fix default icon path in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function findLatLonColumns(columns) {
  const names = columns.map(c => (typeof c === 'object' ? c.name : c));
  const lower = names.map(n => n.toLowerCase());
  let latIdx = lower.findIndex(n => n === 'lat' || n === 'latitude' || n === 'y');
  let lonIdx = lower.findIndex(n => n === 'lon' || n === 'lng' || n === 'longitude' || n === 'x');
  if (latIdx < 0) latIdx = 0;
  if (lonIdx < 0) lonIdx = 1;
  return { latIdx, lonIdx, latCol: names[latIdx], lonCol: names[lonIdx] };
}

function Bounds({ points }) {
  const map = useMap();
  if (!points.length) return null;
  const lats = points.map(p => p.lat);
  const lons = points.map(p => p.lon);
  const pad = 0.01;
  map.fitBounds([
    [Math.min(...lats) - pad, Math.min(...lons) - pad],
    [Math.max(...lats) + pad, Math.max(...lons) + pad],
  ], { maxZoom: 14, padding: [20, 20] });
  return null;
}

export function MapView({ columns = [], rows = [], containerRef }) {
  const { latIdx, lonIdx, latCol, lonCol } = useMemo(() => findLatLonColumns(columns), [columns]);

  const points = useMemo(() => {
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const lat = Number(rows[i][latIdx]);
      const lon = Number(rows[i][lonIdx]);
      if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        out.push({ lat, lon, row: rows[i], rowIndex: i });
      }
    }
    return out;
  }, [rows, latIdx, lonIdx]);

  const [categoryCol, setCategoryCol] = useState(null);
  const colNames = useMemo(() => columns.map(c => (typeof c === 'object' ? c.name : c)), [columns]);

  const hasValidPoints = points.length > 0;
  const center = hasValidPoints
    ? [
        points.reduce((s, p) => s + p.lat, 0) / points.length,
        points.reduce((s, p) => s + p.lon, 0) / points.length,
      ]
    : [40, 0];

  const colorByCat = useMemo(() => {
    if (!categoryCol) return () => '#58a6ff';
    const ci = colNames.indexOf(categoryCol);
    if (ci < 0) return () => '#58a6ff';
    const vals = [...new Set(points.map(p => String(p.row[ci] ?? '')))];
    const palette = ['#58a6ff', '#3fb950', '#f0c674', '#f85149', '#bc8cff', '#79b8ff', '#56d364', '#e3b341'];
    const map = new Map(vals.map((v, i) => [v, palette[i % palette.length]]));
    return row => map.get(String(row[ci] ?? '')) || '#58a6ff';
  }, [categoryCol, colNames, points]);

  if (!hasValidPoints) {
    return (
      <div className="map-view-empty">
        <p>No valid latitude/longitude columns found.</p>
        <p>Add columns named <code>lat</code>/<code>lon</code> or <code>latitude</code>/<code>longitude</code> (or x/y).</p>
      </div>
    );
  }

  return (
    <div className="map-view">
      <div className="map-view-controls">
        <label>
          Color by
          <select value={categoryCol || ''} onChange={e => setCategoryCol(e.target.value || null)}>
            <option value="">—</option>
            {colNames.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <span className="map-view-meta">{points.length} points</span>
      </div>
      <div className="map-view-container" ref={containerRef}>
        <MapContainer
          center={center}
          zoom={4}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Bounds points={points} />
          {points.slice(0, 2000).map((p, i) => (
            <CircleMarker
              key={i}
              center={[p.lat, p.lon]}
              radius={categoryCol ? 6 : 5}
              pathOptions={{ fillColor: colorByCat(p.row), color: '#1a2332', weight: 1, fillOpacity: 0.8 }}
            >
              <Popup>
                <pre>{JSON.stringify(p.row.slice(0, 6), null, 0)}</pre>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
