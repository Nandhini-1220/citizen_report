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
  CheckCircle2, 
  AlertCircle, 
  Download, 
  RefreshCw, 
  Activity, 
  LogOut,
  Camera,
  Check,
  X,
  Eye,
  ShieldCheck,
  Ban,
  Image as ImageIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Configure Default Leaflet Marker Icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0, emergency: 0 });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [loading, setLoading] = useState(true);

  // Review & Verification Modal State
  const [reviewingTicket, setReviewingTicket] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [fetchingProof, setFetchingProof] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const heatLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const hasUserPannedRef = useRef(false);

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
        updateMapElements(items);
      }
    } catch (err) {
      console.error('Error fetching dashboard telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateMapElements = (items) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const validItems = items.filter(c => 
      c.status !== 'FAKE_CALL' && 
      typeof c.lat === 'number' && 
      typeof c.lng === 'number' && 
      !isNaN(c.lat) && 
      !isNaN(c.lng)
    );
    if (validItems.length === 0) return;

    // 1. Update Heatmap Layer
    const points = validItems.map(c => {
      let weight = 0.6;
      if (c.urgency === 'Emergency') weight = 1.0;
      else if (c.urgency === 'High') weight = 0.8;
      return [c.lat, c.lng, weight];
    });

    try {
      if (typeof L.heatLayer === 'function') {
        if (heatLayerRef.current) {
          heatLayerRef.current.setLatLngs(points);
        } else {
          heatLayerRef.current = L.heatLayer(points, {
            radius: 28,
            blur: 16,
            maxZoom: 16,
            gradient: { 0.4: '#3b82f6', 0.7: '#f59e0b', 1.0: '#ef4444' }
          }).addTo(map);
        }
      }
    } catch (e) {
      console.warn('Heatmap layer update warning:', e);
    }

    // 2. Update Markers
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    } else {
      markersLayerRef.current = L.layerGroup().addTo(map);
    }

    validItems.forEach(c => {
      const isEmergency = c.urgency === 'Emergency';
      const isPending = c.status === 'PENDING_VERIFICATION';
      const color = isEmergency ? '#ef4444' : isPending ? '#9333ea' : '#0b3c5d';

      const customMarker = L.circleMarker([c.lat, c.lng], {
        radius: isEmergency ? 9 : 7,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      });

      customMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; padding: 2px;">
          <strong style="color: #0b3c5d;">#${c.ticket_id}</strong> - <span>${c.category}</span><br/>
          <span style="font-size: 11px; color: #475569;">${c.summary || ''}</span><br/>
          <strong style="font-size: 10px; color: ${color}; text-transform: uppercase;">${c.status} (${c.urgency})</strong>
        </div>
      `);

      markersLayerRef.current.addLayer(customMarker);
    });

    // 3. Auto-Fit View
    if (!hasUserPannedRef.current && validItems.length > 0) {
      const bounds = L.latLngBounds(validItems.map(c => [c.lat, c.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
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

        map.on('dragstart', () => {
          hasUserPannedRef.current = true;
        });

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
        markersLayerRef.current = null;
      }
    };
  }, []);

  const handleOpenReview = async (item) => {
    setFetchingProof(true);
    setReviewingTicket(item);
    try {
      const res = await axios.get(`http://localhost:8001/api/complaints/${item.ticket_id}`);
      if (res.data) {
        setReviewingTicket(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch single record:', err);
    } finally {
      setFetchingProof(false);
    }
  };

  const handleAdminVerify = async (action) => {
    if (!reviewingTicket) return;
    setVerifying(true);

    try {
      const formData = new FormData();
      formData.append('admin_action', action);
      formData.append('admin_remarks', 'Verified by Municipal Administrator.');

      await axios.post(`http://localhost:8001/api/admin/verify-and-complete/${reviewingTicket.ticket_id}`, formData);
      setReviewingTicket(null);
      fetchDashboardData();
    } catch (e) {
      alert("Failed to submit verification status.");
    } finally {
      setVerifying(false);
    }
  };

  // Trigger Fake Call & Blacklist Action
  const handleMarkFakeCall = async (ticketId) => {
    const confirmBlock = window.confirm(
      `Confirm marking Ticket #${ticketId} as a FAKE CALL? This will permanently blacklist the caller's mobile number from lodging further complaints.`
    );
    if (!confirmBlock) return;

    setVerifying(true);
    try {
      const formData = new FormData();
      formData.append('reason', 'Inspected by officer and confirmed non-existent / fraudulent complaint.');

      await axios.post(`http://localhost:8001/api/admin/mark-fake/${ticketId}`, formData);
      alert(`Ticket #${ticketId} has been marked as FAKE CALL and caller number is now blacklisted.`);
      setReviewingTicket(null);
      fetchDashboardData();
    } catch (err) {
      alert("Failed to mark ticket as fake call.");
    } finally {
      setVerifying(false);
    }
  };

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

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `http://localhost:8001${cleanPath}`;
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-800 flex flex-col justify-between font-sans">
      <div>
        {/* National Top Strip */}
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-white to-green-600 w-full" />
        <div className="bg-[#0b3c5d] text-white py-2 px-6 text-xs md:text-sm flex justify-between items-center font-bold tracking-wide">
          <span>GOVERNMENT OF CITIZEN SERVICES • MUNICIPAL COMMAND CENTER</span>
          <span>ADMINISTRATIVE OVERSIGHT & FRAUD ENFORCEMENT</span>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          
          {/* Header */}
          <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-[#0b3c5d] flex items-center gap-2">
                <Activity className="w-6 h-6 text-emerald-600" /> Municipal Command & Verification Ledger
              </h1>
              <p className="text-xs text-slate-500 mt-1 font-medium">Real-Time City Density, Field Photo Proof & Fraud Blacklisting</p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-[#0b3c5d]" /> {isGeneratingPdf ? 'Compiling...' : 'Export Audit PDF'}
              </button>
              <button
                onClick={() => navigate('/officer/portal')}
                className="px-4 py-2 bg-[#0b3c5d] hover:bg-[#07273d] text-white rounded-lg text-xs font-bold shadow-sm transition"
              >
                Officer Portal →
              </button>
            </div>
          </div>

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase text-slate-500">Total Logged Complaints</span>
              <p className="text-3xl font-extrabold font-mono text-slate-800 mt-1">{stats.total || 0}</p>
            </div>
            <div className="bg-white border border-slate-300 border-l-4 border-l-amber-500 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase text-amber-700">Active In-Flight</span>
              <p className="text-3xl font-extrabold font-mono text-amber-600 mt-1">{stats.active || 0}</p>
            </div>
            <div className="bg-white border border-slate-300 border-l-4 border-l-purple-500 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase text-purple-700">Pending Proof Review</span>
              <p className="text-3xl font-extrabold font-mono text-purple-700 mt-1">
                {complaints.filter(c => c.status === 'PENDING_VERIFICATION').length}
              </p>
            </div>
            <div className="bg-white border border-slate-300 border-l-4 border-l-emerald-500 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-bold uppercase text-emerald-700">Verified & Completed</span>
              <p className="text-3xl font-extrabold font-mono text-emerald-600 mt-1">{stats.resolved || 0}</p>
            </div>
          </div>

          {/* Map + Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-300 rounded-xl p-5 shadow-sm flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-red-600" /> City Incident Density Map & Active Pin Locations
                </h3>
                <button
                  onClick={() => {
                    hasUserPannedRef.current = false;
                    updateMapElements(complaints);
                  }}
                  className="text-[11px] font-bold text-[#0b3c5d] hover:underline"
                >
                  Recenter All Incidents
                </button>
              </div>
              <div ref={mapContainerRef} className="h-80 w-full rounded border border-slate-200 overflow-hidden" />
            </div>

            <div className="bg-white border border-slate-300 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
                  Operational Architecture Telemetry
                </h3>
                <div className="space-y-3 pt-3 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Spatial Deduplication:</span>
                    <span className="font-bold text-slate-800">Active (FAISS)</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Multilingual STT:</span>
                    <span className="font-bold text-emerald-700">Faster-Whisper</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>LLM Engine:</span>
                    <span className="font-bold text-[#0b3c5d]">Groq LPU</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Fraud Blacklisting:</span>
                    <span className="font-bold text-red-600">Enforced</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button onClick={fetchDashboardData} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-300 transition">
                  <RefreshCw className="w-4 h-4" /> Refresh Telemetry
                </button>
                <button
                  onClick={() => { localStorage.clear(); navigate('/login'); }}
                  className="w-full py-2.5 bg-white hover:bg-red-50 text-red-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-red-200 transition"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Live Incident Ledger */}
          <div className="bg-white border border-slate-300 rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                City-Wide Live Incident Ledger & Verification
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs gov-table">
                <thead>
                  <tr>
                    <th className="p-4">Ticket</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Summary</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {complaints.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                        No grievance records currently available in the ledger.
                      </td>
                    </tr>
                  ) : (
                    complaints.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-mono font-bold text-[#0b3c5d]">#{item.ticket_id}</td>
                        <td className="p-4 font-semibold text-slate-800">{item.category}</td>
                        <td className="p-4 text-slate-600 max-w-md truncate">{item.summary}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                            item.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            item.status === 'PENDING_VERIFICATION' ? 'bg-purple-100 text-purple-800 border border-purple-300 font-extrabold animate-pulse' :
                            item.status === 'FAKE_CALL' ? 'bg-red-100 text-red-800 border border-red-300 font-bold' :
                            item.status === 'ACKNOWLEDGED' ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {item.status === 'PENDING_VERIFICATION' ? 'PROOF AWAITING REVIEW' : item.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.status === 'PENDING_VERIFICATION' && (
                              <button
                                onClick={() => handleOpenReview(item)}
                                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-md font-bold text-xs flex items-center gap-1 shadow-sm transition"
                              >
                                <Eye className="w-3.5 h-3.5" /> Review Proof
                              </button>
                            )}

                            {item.status !== 'FAKE_CALL' && item.status !== 'RESOLVED' && (
                              <button
                                onClick={() => handleMarkFakeCall(item.ticket_id)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 rounded-md font-bold text-xs flex items-center gap-1 transition"
                                title="Mark as Fake Call and block caller"
                              >
                                <Ban className="w-3.5 h-3.5" /> Fake Call
                              </button>
                            )}

                            {item.status === 'RESOLVED' && (
                              <span className="text-slate-400 font-semibold">Verified / Idle</span>
                            )}
                            {item.status === 'FAKE_CALL' && (
                              <span className="text-red-600 font-bold">Blacklisted</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Admin Verification Modal */}
          {reviewingTicket && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white border-2 border-slate-300 rounded-xl p-8 max-w-2xl w-full relative shadow-2xl max-h-[90vh] overflow-y-auto">
                <button 
                  onClick={() => setReviewingTicket(null)} 
                  className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-800 transition rounded-md"
                >
                  <X className="w-6 h-6" />
                </button>

                <h3 className="text-xl font-bold text-[#0b3c5d] flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-purple-700" /> Admin Proof Verification Desk
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1 mb-5 pb-3 border-b border-slate-200">
                  Reviewing Resolution Proof for Ticket #{reviewingTicket.ticket_id}
                </p>

                <div className="space-y-4 text-xs">
                  {/* Photo Preview */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-2">Officer Uploaded Proof Image</label>
                    {fetchingProof ? (
                      <div className="p-8 text-center text-slate-500 bg-slate-100 rounded-lg border border-slate-300">
                        Fetching high-resolution image proof...
                      </div>
                    ) : reviewingTicket.resolution_image ? (
                      <div className="relative rounded-lg border-2 border-slate-300 overflow-hidden bg-slate-100 p-2 flex justify-center items-center min-h-[220px]">
                        <img
                          src={getImageUrl(reviewingTicket.resolution_image)}
                          alt="Resolution Proof"
                          className="max-h-80 w-auto object-contain rounded border border-slate-200"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://placehold.co/600x400/e2e8f0/475569?text=Proof+Image+Load+Error";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-500 bg-slate-100 rounded-lg border border-slate-300 flex flex-col items-center justify-center gap-2">
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                        <span>No resolution photo attached to this record.</span>
                      </div>
                    )}
                  </div>

                  {/* Coordinates & Comparison */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div>
                      <span className="text-slate-500 font-bold block">Incident Reported GPS</span>
                      <span className="font-mono font-bold text-slate-800">
                        {reviewingTicket.lat ? `${reviewingTicket.lat.toFixed(4)}° N, ${reviewingTicket.lng?.toFixed(4)}° E` : 'Not recorded'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">Officer Resolution GPS</span>
                      <span className="font-mono font-bold text-purple-700">
                        {reviewingTicket.resolution_lat 
                          ? `${reviewingTicket.resolution_lat.toFixed(4)}° N, ${reviewingTicket.resolution_lng?.toFixed(4)}° E` 
                          : 'Geo-tag captured'}
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  {reviewingTicket.resolved_notes && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-slate-500 font-bold block mb-1">Field Officer Notes:</span>
                      <p className="text-slate-800 font-medium">{reviewingTicket.resolved_notes}</p>
                    </div>
                  )}

                  {/* Decision Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 mt-6">
                    <button
                      type="button"
                      disabled={verifying}
                      onClick={() => handleMarkFakeCall(reviewingTicket.ticket_id)}
                      className="py-3 px-4 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Ban className="w-4 h-4" /> Fake Call & Block
                    </button>
                    <button
                      type="button"
                      disabled={verifying}
                      onClick={() => handleAdminVerify('REJECT')}
                      className="flex-1 py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    >
                      <X className="w-4 h-4" /> Reject Proof (Send Back)
                    </button>
                    <button
                      type="button"
                      disabled={verifying}
                      onClick={() => handleAdminVerify('APPROVE')}
                      className="flex-1 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" /> Approve & Mark Completed
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-600 font-medium">
        Municipal Corporation Automated Citizen Grievance Redressal System • Sub-Second Triage
      </footer>
    </div>
  );
}