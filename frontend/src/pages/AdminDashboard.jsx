import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { 
  Building, 
  MapPin, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Download,
  RefreshCw,
  FileText,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0, emergency: 0 });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [loading, setLoading] = useState(true);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const heatLayerRef = useRef(null);

  const fetchDashboardData = async () => {
    try {
      const [overviewRes, feedRes] = await Promise.allSettled([
        axios.get('http://localhost:8001/api/dashboard/overview'),
        axios.get('http://localhost:8001/api/dashboard/live-feed')
      ]);
      
      if (overviewRes.status === 'fulfilled' && overviewRes.value.data) {
        setStats(overviewRes.value.data);
      }
      
      if (feedRes.status === 'fulfilled' && Array.isArray(feedRes.value.data)) {
        const items = feedRes.value.data;
        setComplaints(items);
        updateHeatmap(items);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateHeatmap = (items) => {
    if (!mapInstanceRef.current || typeof L.heatLayer !== 'function') return;

    const points = items.map(c => {
      let weight = 0.5;
      if (c.urgency === 'Emergency') weight = 1.0;
      else if (c.urgency === 'High') weight = 0.8;
      return [c.lat || 13.0827, c.lng || 80.2707, weight];
    });

    try {
      if (heatLayerRef.current) {
        heatLayerRef.current.setLatLngs(points);
      } else if (points.length > 0) {
        heatLayerRef.current = L.heatLayer(points, {
          radius: 25,
          blur: 15,
          maxZoom: 16,
          gradient: { 0.4: '#3b82f6', 0.7: '#f59e0b', 1.0: '#ef4444' }
        }).addTo(mapInstanceRef.current);
      }
    } catch (e) {
      console.warn('Heatmap layer update warning:', e);
    }
  };

  useEffect(() => {
    // 1. Clean container if it has a stale Leaflet ID from StrictMode
    if (mapContainerRef.current) {
      if (mapContainerRef.current._leaflet_id) {
        mapContainerRef.current._leaflet_id = null;
      }
      
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([13.0827, 80.2707], 12);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);
        mapInstanceRef.current = map;
      }
    }

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);

    // 2. CRITICAL CLEANUP: destroy map instance on unmount to prevent white screen crashes
    return () => {
      clearInterval(interval);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        heatLayerRef.current = null;
      }
    };
  }, []);

  const handleDownloadPdf = async () => {
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
      link.setAttribute('download', `Municipal_Audit_Report_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert('Failed to generate PDF report. Ensure backend report engine is running.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Command Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Municipal Command & Oversight
            </span>
            <h1 className="text-2xl font-bold text-white mt-1">Incident Intelligence Center</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              {isGeneratingPdf ? 'Compiling PDF...' : 'Download Incident Audit PDF'}
            </button>
            <button
              onClick={() => navigate('/officer/portal')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
            >
              Officer Portal →
            </button>
          </div>
        </div>

        {/* Executive Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase">Total Logged Complaints</p>
            <p className="text-3xl font-bold text-white mt-1 font-mono">{stats.total || 0}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <p className="text-xs font-semibold text-amber-400 uppercase">Pending / In Progress</p>
            <p className="text-3xl font-bold text-amber-400 mt-1 font-mono">{stats.active || 0}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <p className="text-xs font-semibold text-emerald-400 uppercase">Resolved Cases</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1 font-mono">{stats.resolved || 0}</p>
          </div>
          <div className="bg-slate-900 border border-red-900/50 bg-red-950/20 rounded-lg p-4">
            <p className="text-xs font-semibold text-red-400 uppercase">Critical / Emergencies</p>
            <p className="text-3xl font-bold text-red-400 mt-1 font-mono">{stats.emergency || 0}</p>
          </div>
        </div>

        {/* Map & Live Feed Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Geospatial Heatmap */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" /> City Incident Density Map
              </h3>
              <span className="text-xs text-slate-500">Live GPS Coordinates</span>
            </div>
            <div ref={mapContainerRef} className="h-80 w-full rounded border border-slate-800 overflow-hidden" />
          </div>

          {/* Quick Statistics Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
                Operational Summary
              </h3>
              <div className="space-y-3 pt-3 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Deduplication Efficiency:</span>
                  <span className="font-bold text-white">Active (FAISS)</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Whisper STT Translation:</span>
                  <span className="font-bold text-emerald-400">Online</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Groq Extraction Engine:</span>
                  <span className="font-bold text-emerald-400">Llama-3.1-8B</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Average Resolution SLA:</span>
                  <span className="font-bold text-white">4.2 Hours</span>
                </div>
              </div>
            </div>

            <button
  onClick={() => {
    localStorage.clear();
    navigate('/login');
  }}
  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-xs font-semibold"
>
  Sign Out
</button>

            <button
              onClick={fetchDashboardData}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Refresh Feed
            </button>
          </div>
        </div>

        {/* Live Complaint Stream Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> City-Wide Complaint Stream
            </h3>
            <span className="text-xs text-slate-500">Auto-refresh: 5s</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-950 text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="p-3">Ticket</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Summary</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Callers</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {complaints.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      No complaints registered yet.
                    </td>
                  </tr>
                ) : (
                  complaints.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-blue-400">#{item.ticket_id}</td>
                      <td className="p-3 font-medium text-slate-200">{item.category}</td>
                      <td className="p-3 text-slate-400 max-w-md truncate">{item.summary}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          item.urgency === 'Emergency' ? 'bg-red-950 text-red-300 border border-red-800' :
                          item.urgency === 'High' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {item.urgency}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-200">{item.report_count}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-medium text-slate-300">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}