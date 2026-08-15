import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet.heat';
import { 
  Activity, 
  Users, 
  ShieldAlert, 
  FileText, 
  RefreshCw, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Download 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0, emergency: 0 });
  const [categoryData, setCategoryData] = useState([]);
  const [sentimentData, setSentimentData] = useState([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const heatLayerRef = useRef(null);

  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:8001/api/dashboard/overview');
      const feedRes = await axios.get('http://localhost:8001/api/dashboard/live-feed');
      
      const items = feedRes.data || [];
      setComplaints(items);

      // Compute statistics
      const total = items.length;
      const resolved = items.filter(c => c.status === 'RESOLVED').length;
      const emergency = items.filter(c => c.urgency === 'Emergency').length;
      setStats({ total, active: total - resolved, resolved, emergency });

      // Build Category chart aggregation
      const catCount = {};
      items.forEach(c => {
        catCount[c.category] = (catCount[c.category] || 0) + 1;
      });
      setCategoryData(Object.entries(catCount).map(([name, count]) => ({ name, count })));

      // Build Sentiment breakdown
      const sentCount = { Positive: 0, Neutral: 0, Negative: 0 };
      items.forEach(c => {
        if (sentCount[c.sentiment] !== undefined) sentCount[c.sentiment] += 1;
      });
      setSentimentData([
        { name: 'Positive', value: sentCount.Positive, color: '#10b981' },
        { name: 'Neutral', value: sentCount.Neutral, color: '#64748b' },
        { name: 'Negative', value: sentCount.Negative, color: '#ef4444' }
      ]);

      // Update Heatmap
      updateHeatmap(items);
    } catch (err) {
      console.error('Failed to load dashboard state:', err);
    }
  };

  const updateHeatmap = (items) => {
    if (!mapInstanceRef.current) return;

    const points = items.map(c => {
      let weight = 0.4;
      if (c.urgency === 'Emergency') weight = 1.0;
      else if (c.urgency === 'High') weight = 0.75;
      return [c.lat || 13.0827, c.lng || 80.2707, weight];
    });

    if (heatLayerRef.current) {
      heatLayerRef.current.setLatLngs(points);
    } else if (points.length > 0) {
      heatLayerRef.current = L.heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: { 0.4: '#3b82f6', 0.65: '#f59e0b', 1.0: '#ef4444' }
      }).addTo(mapInstanceRef.current);
    }
  };

  useEffect(() => {
    // Initialize Leaflet Map once
    if (mapContainerRef.current && !mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([13.0827, 80.2707], 12);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB & OpenStreetMap'
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    fetchData();
    const interval = setInterval(fetchData, 4000); // 4-second real-time poll
    return () => clearInterval(interval);
  }, []);

  const downloadPdfReport = async () => {
    try {
      setIsGeneratingPdf(true);
      const response = await axios.post(
        'http://localhost:8001/api/reports/generate',
        { format: 'PDF' },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Municipal_Incident_Audit_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert('Report generator error. Ensure backend PDF engine is active.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            Real-Time Command Center
          </span>
          <h1 className="text-2xl font-bold mt-2">Municipal Incident Intelligence Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadPdfReport}
            disabled={isGeneratingPdf}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-semibold flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            {isGeneratingPdf ? 'Compiling PDF...' : 'Download Audit PDF'}
          </button>
          <a
            href="/officer/portal"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition"
          >
            Officer Triage Workspace →
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase">Total Incidents</p>
          <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-400 uppercase">Active / In Progress</p>
          <p className="text-3xl font-bold text-amber-400 mt-1">{stats.active}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-semibold text-emerald-400 uppercase">Resolved</p>
          <p className="text-3xl font-bold text-emerald-400 mt-1">{stats.resolved}</p>
        </div>
        <div className="bg-slate-900 border border-red-900/50 bg-red-950/10 rounded-2xl p-4">
          <p className="text-xs font-semibold text-red-400 uppercase">Emergency Hotspots</p>
          <p className="text-3xl font-bold text-red-400 mt-1">{stats.emergency}</p>
        </div>
      </div>

      {/* Geospatial Heatmap & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-400" /> City Grievance Heat Density Map
            </h3>
            <span className="text-xs text-slate-500">Live Weighted Radius</span>
          </div>
          <div ref={mapContainerRef} className="h-80 w-full rounded-xl overflow-hidden" />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Category Volume</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="name" type="category" width={90} stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Live Ingestion Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" /> Live Complaint Stream
          </h3>
          <span className="text-xs text-slate-500">Auto-refreshing every 4s</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-950 text-slate-500 border-b border-slate-800">
              <tr>
                <th className="p-3">Ticket</th>
                <th className="p-3">Category</th>
                <th className="p-3">Summary</th>
                <th className="p-3">Urgency</th>
                <th className="p-3">Callers</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {complaints.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono font-bold text-blue-400">#{item.ticket_id}</td>
                  <td className="p-3 font-medium text-slate-200">{item.category}</td>
                  <td className="p-3 text-slate-400 max-w-md truncate">{item.summary}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      item.urgency === 'Emergency' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      item.urgency === 'High' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {item.urgency}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-slate-200">{item.report_count}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-xs font-medium text-slate-300">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}