import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function findSuggestedLatLon(columns, rows = []) {
  const names = columns.map(c => (typeof c === 'object' ? c.name : c));
  const lower = names.map(n => String(n).toLowerCase());
  const latPatterns = ['lat', 'latitude', 'y', 'geo_lat', 'position_lat', 'start_lat', 'end_lat'];
  const lonPatterns = ['lon', 'lng', 'longitude', 'x', 'geo_lon', 'position_lon', 'start_lon', 'end_lon'];

  let latIdx = lower.findIndex(n => latPatterns.some(p => n === p || n.includes(p)));
  let lonIdx = lower.findIndex(n => lonPatterns.some(p => n === p || n.includes(p)));

  if (latIdx < 0 && lonIdx >= 0) latIdx = lonIdx === 0 ? 1 : 0;
  if (lonIdx < 0 && latIdx >= 0) lonIdx = latIdx === 0 ? 1 : 0;

  if ((latIdx < 0 || lonIdx < 0) && rows.length > 0) {
    for (let i = 0; i < names.length - 1; i++) {
      const a = Number(rows[0][i]);
      const b = Number(rows[0][i + 1]);
      if (Number.isFinite(a) && Number.isFinite(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180) {
        latIdx = i; lonIdx = i + 1; break;
      }
      if (Number.isFinite(b) && Number.isFinite(a) && b >= -90 && b <= 90 && a >= -180 && a <= 180) {
        latIdx = i + 1; lonIdx = i; break;
      }
    }
  }

  if (latIdx < 0) latIdx = 0;
  if (lonIdx < 0) lonIdx = Math.min(1, names.length - 1);
  return { latCol: names[latIdx], lonCol: names[lonIdx] };
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

const MARKER_SIZES = { small: 4, medium: 6, large: 8 };
const PALETTE = ['#58a6ff', '#3fb950', '#f0c674', '#f85149', '#bc8cff', '#79b8ff', '#56d364', '#e3b341'];

export function MapView({ columns = [], rows = [], containerRef }) {
  const colNames = useMemo(() => columns.map(c => (typeof c === 'object' ? c.name : c)), [columns]);

  const suggested = useMemo(() => findSuggestedLatLon(columns, rows), [columns, rows]);

  const [latCol, setLatCol] = useState(suggested.latCol || colNames[0] || '');
  const [lonCol, setLonCol] = useState(suggested.lonCol || colNames[1] || '');
  const [categoryCol, setCategoryCol] = useState(null);
  const [labelCol, setLabelCol] = useState(null);
  const [markerSize, setMarkerSize] = useState('medium');

  useEffect(() => {
    if (!colNames.length) return;
    const hasLat = latCol && colNames.includes(latCol);
    const hasLon = lonCol && colNames.includes(lonCol);
    if (!hasLat) setLatCol(suggested.latCol || colNames[0] || '');
    if (!hasLon) setLonCol(suggested.lonCol || colNames[Math.min(1, colNames.length - 1)] || '');
  }, [colNames, suggested.latCol, suggested.lonCol, latCol, lonCol]);

  const latIdx = colNames.indexOf(latCol);
  const lonIdx = colNames.indexOf(lonCol);

  const points = useMemo(() => {
    if (latIdx < 0 || lonIdx < 0) return [];
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

  const hasValidPoints = points.length > 0;
  const center = hasValidPoints
    ? [points.reduce((s, p) => s + p.lat, 0) / points.length, points.reduce((s, p) => s + p.lon, 0) / points.length]
    : [40, 0];

  const colorByCat = useMemo(() => {
    if (!categoryCol) return () => PALETTE[0];
    const ci = colNames.indexOf(categoryCol);
    if (ci < 0) return () => PALETTE[0];
    const vals = [...new Set(points.map(p => String(p.row[ci] ?? '')))];
    const map = new Map(vals.map((v, i) => [v, PALETTE[i % PALETTE.length]]));
    return row => map.get(String(row[ci] ?? '')) || PALETTE[0];
  }, [categoryCol, colNames, points]);

  const radius = MARKER_SIZES[markerSize] ?? 6;

  const getPopupContent = (p) => {
    const row = p.row;
    const labelIdx = labelCol ? colNames.indexOf(labelCol) : -1;
    const label = labelIdx >= 0 ? String(row[labelIdx] ?? '') : '';
    const showCols = colNames.slice(0, 8);
    return (
      <div className="map-popup-inner">
        {label && <div className="map-popup-label">{label}</div>}
        <dl className="map-popup-fields">
          {showCols.map(col => {
            const idx = colNames.indexOf(col);
            if (idx < 0) return null;
            return (
              <React.Fragment key={col}>
                <dt>{col}</dt>
                <dd>{String(row[idx] ?? '')}</dd>
              </React.Fragment>
            );
          })}
        </dl>
      </div>
    );
  };

  if (!colNames.length) {
    return (
      <div className="map-view-empty">
        <p>Run a query to load columns and choose latitude/longitude.</p>
      </div>
    );
  }

  return (
    <div className="map-view">
      <div className="map-view-controls">
        <label>
          Latitude column
          <select value={latCol} onChange={e => setLatCol(e.target.value)}>
            {colNames.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Longitude column
          <select value={lonCol} onChange={e => setLonCol(e.target.value)}>
            {colNames.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Color / Group by
          <select value={categoryCol || ''} onChange={e => setCategoryCol(e.target.value || null)}>
            <option value="">—</option>
            {colNames.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Label column
          <select value={labelCol || ''} onChange={e => setLabelCol(e.target.value || null)}>
            <option value="">—</option>
            {colNames.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Marker size
          <select value={markerSize} onChange={e => setMarkerSize(e.target.value)}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
        <span className="map-view-meta">{hasValidPoints ? `${points.length} points` : 'No valid coordinates'}</span>
      </div>

      {!hasValidPoints && (
        <div className="map-view-empty map-view-empty-inline">
          <p>No valid coordinates for selected Lat/Lon columns. Choose columns that contain latitude and longitude values.</p>
        </div>
      )}

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
          {hasValidPoints && <Bounds points={points} />}
          {hasValidPoints && points.slice(0, 3000).map((p, i) => (
            <CircleMarker
              key={i}
              center={[p.lat, p.lon]}
              radius={radius}
              pathOptions={{
                fillColor: colorByCat(p.row),
                color: '#1a2332',
                weight: 1,
                fillOpacity: 0.8,
              }}
            >
              <Popup>{getPopupContent(p)}</Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
