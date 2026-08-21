import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { MapPin, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function GrievanceMap({ complaints = [] }) {
  const getMarkerColor = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'emergency':
      case 'high': return '#f43f5e'; // Rose-500
      case 'medium': return '#f59e0b'; // Amber-500
      default: return '#10b981'; // Emerald-500
    }
  };

  return (
    <div className="w-full h-[450px] glass-panel rounded-2xl p-2 relative overflow-hidden">
      <MapContainer
        center={[12.9852, 80.2079]}
        zoom={12}
        className="leaflet-container"
      >
        {/* CartoDB Dark Matter Base Tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {complaints.map((c) => (
          <CircleMarker
            key={c.id || c.ticket_id}
            center={[c.lat || 12.9852, c.lng || 80.2079]}
            radius={7 + Math.min((c.report_count || 1) * 2.5, 10)}
            pathOptions={{
              fillColor: getMarkerColor(c.urgency),
              fillOpacity: 0.85,
              color: '#ffffff',
              weight: 1.5
            }}
          >
            <Popup>
              <div className="p-1 space-y-1.5 min-w-[200px] text-xs font-sans">
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-1">
                  <span className="font-mono font-bold text-emerald-400">#{c.ticket_id}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-300 px-1.5 py-0.5 rounded bg-slate-800">
                    {c.status}
                  </span>
                </div>
                <p className="font-bold text-white text-[11px]">{c.category}</p>
                <p className="text-slate-300 text-[10px] line-clamp-2 leading-relaxed">{c.summary}</p>
                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-750">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" /> {c.urgency}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Users className="w-3 h-3 text-blue-400" /> {c.report_count || 1} caller(s)
                  </span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}