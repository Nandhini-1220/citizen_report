import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { Building, MapPin, Users, Clock, CheckCircle2, AlertCircle, Download, RefreshCw, FileText, Activity, LogOut } from 'lucide-react';
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
      console.error(err);
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
      return [c.lat || 12.9852, c.lng || 80.2079, weight];
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
      console.warn(e);
    }
  };

  useEffect(() => {
    if (mapContainerRef.current) {
      if (mapContainerRef.current._leaflet_id) {
        mapContainerRef.current._leaflet_id = null;
      }
      
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([12.9852, 80.2079], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        mapInstanceRef.current = map;
      }
    }

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);

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
      alert('Failed to generate PDF report.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-800 flex flex-col justify-between">
      <div>
        <div className="h-1 bg-gradient-to-r from-orange-500 via-white to-green-600 w-full" />
        <div className="bg-[#0b3c5d] text-white py-1.5 px-4 text-[11px] flex justify-between items-center font-medium">
          <span>GOVERNMENT OF CITIZEN SERVICES • MUNICIPAL COMMAND CENTER</span>
          <span>ADMINISTRATIVE OVERSIGHT</span>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          
          {/* Header */}
          <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-[#0b3c5d] flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" /> Municipal Operations & Telemetry
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Real-Time City-Wide Incident Density and Audit Ledger</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-md text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-4 h-4 text-[#0b3c5d]" /> {isGeneratingPdf ? 'Compiling...' : 'Export Audit PDF'}
              </button>
              <button
                onClick={() => navigate('/officer/portal')}
                className="px-3.5 py-2 bg-[#0b3c5d] hover:bg-[#07273d] text-white rounded-md text-xs font-bold shadow-sm"
              >
                Officer Portal →
              </button>
            </div>
          </div>

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-300 rounded-lg p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-500">Total Logged Complaints</span>
              <p className="text-2xl font-bold font-mono text-slate-800 mt-1">{stats.total || 0}</p>
            </div>
            <div className="bg-white border border-slate-300 border-l-4 border-l-amber-500 rounded-lg p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-amber-700">Active In-Flight</span>
              <p className="text-2xl font-bold font-mono text-amber-600 mt-1">{stats.active || 0}</p>
            </div>
            <div className="bg-white border border-slate-300 border-l-4 border-l-emerald-500 rounded-lg p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-emerald-700">Resolved Work Orders</span>
              <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">{stats.resolved || 0}</p>
            </div>
            <div className="bg-white border border-slate-300 border-l-4 border-l-red-500 rounded-lg p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-red-700">Critical Emergencies</span>
              <p className="text-2xl font-bold font-mono text-red-600 mt-1">{stats.emergency || 0}</p>
            </div>
          </div>

          {/* Map + Table Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-300 rounded-lg p-4 shadow-sm flex flex-col space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-red-600" /> City Incident Density Map
              </h3>
              <div ref={mapContainerRef} className="h-80 w-full rounded border border-slate-200 overflow-hidden" />
            </div>

            <div className="bg-white border border-slate-300 rounded-lg p-5 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
                  System Architecture Telemetry
                </h3>
                <div className="space-y-3 pt-3 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Spatial Deduplication:</span>
                    <span className="font-bold text-slate-800">Active (FAISS)</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Whisper STT Engine:</span>
                    <span className="font-bold text-emerald-700">Online</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Inference LLM Core:</span>
                    <span className="font-bold text-[#0b3c5d]">Groq LPU</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Citizen Charter SLA:</span>
                    <span className="font-bold text-slate-800">4.0 Hours</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={fetchDashboardData}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-300"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
                </button>
                <button
                  onClick={() => {
                    localStorage.clear();
                    navigate('/login');
                  }}
                  className="w-full py-2 bg-white hover:bg-red-50 text-red-600 rounded text-xs font-semibold flex items-center justify-center gap-1.5 border border-red-200"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Feed Table */}
          <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                City-Wide Live Incident Ledger
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs gov-table">
                <thead>
                  <tr>
                    <th className="p-3">Ticket</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Summary</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3 text-center">Subscribers</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {complaints.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-[#0b3c5d]">#{item.ticket_id}</td>
                      <td className="p-3 font-semibold text-slate-800">{item.category}</td>
                      <td className="p-3 text-slate-600 max-w-md truncate">{item.summary}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.urgency === 'Emergency' ? 'bg-red-100 text-red-800' :
                          item.urgency === 'High' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {item.urgency}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">{item.report_count}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
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
      </div>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        Municipal Corporation Automated Citizen Grievance Redressal System • Sub-Second Triage
      </footer>
    </div>
  );
}