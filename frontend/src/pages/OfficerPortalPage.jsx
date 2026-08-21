import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Building2, 
  MapPin, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  LogOut,
  RefreshCw,
  Camera,
  X,
  Upload,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OfficerPortalPage() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState(localStorage.getItem('officer_department') || 'Water Supply');
  const [officerName, setOfficerName] = useState(localStorage.getItem('officer_name') || 'Officer In-Charge');
  
  // Acknowledge SLA Modal State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [deadlineHours, setDeadlineHours] = useState(4);
  const [submitting, setSubmitting] = useState(false);

  // Resolution Proof Modal State
  const [resolvingTicket, setResolvingTicket] = useState(null);
  const [proofImage, setProofImage] = useState(null);
  const [proofCoords, setProofCoords] = useState({ lat: null, lng: null });
  const [isLocating, setIsLocating] = useState(false);
  const [resolvedNotes, setResolvedNotes] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`http://localhost:8001/api/officer/tickets?dept=${encodeURIComponent(department)}`);
      setComplaints(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 5000);
    return () => clearInterval(interval);
  }, [department]);

  const handleAcknowledge = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('officer_name', officerName);
      formData.append('deadline_hours', String(deadlineHours));

      await axios.post(`http://localhost:8001/api/officer/acknowledge/${selectedTicket.ticket_id}`, formData);
      setSelectedTicket(null);
      fetchTickets();
    } catch (err) {
      alert("Failed to acknowledge ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger Resolution Proof Flow & Capture Live GPS
  const openProofModal = (ticket) => {
    setResolvingTicket(ticket);
    setProofImage(null);
    setResolvedNotes('');
    setIsLocating(true);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setProofCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsLocating(false);
        },
        (err) => {
          console.warn("GPS failed, using incident default coords:", err);
          setProofCoords({ lat: ticket.lat || 12.9852, lng: ticket.lng || 80.2079 });
          setIsLocating(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setProofCoords({ lat: ticket.lat || 12.9852, lng: ticket.lng || 80.2079 });
      setIsLocating(false);
    }
  };

  const handleProofSubmit = async (e) => {
    e.preventDefault();
    if (!proofImage || !resolvingTicket) {
      alert("Please capture or upload a geo-tagged resolution photo.");
      return;
    }
    setUploadingProof(true);

    try {
      const formData = new FormData();
      formData.append('image', proofImage);
      formData.append('resolution_lat', proofCoords.lat || 12.9852);
      formData.append('resolution_lng', proofCoords.lng || 80.2079);
      formData.append('resolved_notes', resolvedNotes || 'Field work completed and verified with geo-tagged photo.');

      await axios.post(`http://localhost:8001/api/officer/resolve-with-proof/${resolvingTicket.ticket_id}`, formData);
      setResolvingTicket(null);
      fetchTickets();
    } catch (err) {
      alert("Failed to submit resolution proof.");
    } finally {
      setUploadingProof(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('officer_department');
    localStorage.removeItem('officer_name');
    navigate('/officer/login');
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-800 flex flex-col justify-between font-sans">
      <div>
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-white to-green-600 w-full" />
        <div className="bg-[#0b3c5d] text-white py-2 px-6 text-xs md:text-sm flex justify-between items-center font-bold tracking-wide">
          <span>GOVERNMENT OF CITIZEN SERVICES • OFFICIAL DEPARTMENT WORKSPACE</span>
          <span>OFFICER IN-CHARGE: {officerName.toUpperCase()}</span>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          
          {/* Header */}
          <header className="bg-white border border-slate-300 rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-[#0b3c5d]">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-[#0b3c5d]">
                  Department Action & Triage Portal
                </h1>
                <p className="text-sm text-slate-600 mt-1 font-medium">
                  Logged in as <span className="font-bold text-slate-900">{officerName}</span> • Jurisdiction: <span className="font-bold text-[#0b3c5d]">{department}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  localStorage.setItem('officer_department', e.target.value);
                }}
                className="bg-white border-2 border-slate-300 text-sm font-bold text-slate-800 rounded-lg px-4 py-2.5 outline-none focus:border-[#0b3c5d] shadow-sm"
              >
                <option value="All">All Departments (Overview)</option>
                <option value="Water Supply">Water Supply</option>
                <option value="Road Maintenance">Road Maintenance</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Electricity Board">Electricity Board</option>
              </select>

              <button onClick={fetchTickets} className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-700 shadow-sm">
                <RefreshCw className="w-5 h-5" />
              </button>

              <button onClick={handleLogout} className="px-4 py-2.5 bg-white hover:bg-red-50 text-red-700 rounded-lg text-sm font-bold flex items-center gap-2 border border-red-300 shadow-sm">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </header>

          {/* Table */}
          <div className="bg-white border border-slate-300 rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Department Grievance Queue ({complaints.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-800">
                <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-300 text-xs">
                  <tr>
                    <th className="py-4 px-5">Ticket ID</th>
                    <th className="py-4 px-5">Category & Summary</th>
                    <th className="py-4 px-5">Location</th>
                    <th className="py-4 px-5">Priority</th>
                    <th className="py-4 px-5">Status / Stage</th>
                    <th className="py-4 px-5 text-right">Field Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-sans">
                  {complaints.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-5 font-mono font-extrabold text-[#0b3c5d] text-base">
                        #{item.ticket_id}
                      </td>
                      <td className="py-4 px-5 max-w-sm">
                        <p className="font-bold text-slate-900 text-sm">{item.category}</p>
                        <p className="text-slate-600 line-clamp-2 text-xs mt-1 leading-relaxed font-medium">{item.summary}</p>
                      </td>
                      <td className="py-4 px-5 text-slate-700 font-medium text-xs">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                          <span className="truncate max-w-[140px]">{item.location_name || `${item.lat?.toFixed(3)}, ${item.lng?.toFixed(3)}`}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 rounded text-xs font-extrabold uppercase tracking-wider border ${
                          item.urgency === 'Emergency' ? 'bg-red-100 text-red-800 border-red-300' :
                          item.urgency === 'High' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {item.urgency}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        {item.status === 'RESOLVED' ? (
                          <span className="text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded font-bold text-xs">
                            COMPLETED & VERIFIED
                          </span>
                        ) : item.status === 'PENDING_VERIFICATION' ? (
                          <span className="text-purple-800 bg-purple-100 border border-purple-300 px-2.5 py-1 rounded font-bold text-xs">
                            PENDING ADMIN APPROVAL
                          </span>
                        ) : item.status === 'ACKNOWLEDGED' ? (
                          <div>
                            <span className="text-blue-800 bg-blue-100 border border-blue-300 px-2.5 py-1 rounded font-bold text-xs block w-fit">
                              ACKNOWLEDGED
                            </span>
                            {item.deadline_set && (
                              <span className="text-blue-900 font-bold text-xs block mt-1">
                                Target: {new Date(item.deadline_set).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded font-bold text-xs">
                            REGISTERED
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        {item.status === 'REGISTERED' && (
                          <button
                            onClick={() => setSelectedTicket(item)}
                            className="px-4 py-2 bg-[#0b3c5d] hover:bg-[#07273d] text-white rounded-lg font-bold text-xs shadow-md transition"
                          >
                            Acknowledge
                          </button>
                        )}
                        {item.status === 'ACKNOWLEDGED' && (
                          <button
                            onClick={() => openProofModal(item)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 ml-auto shadow-md transition"
                          >
                            <Camera className="w-4 h-4" /> Upload Geo Proof
                          </button>
                        )}
                        {item.status === 'PENDING_VERIFICATION' && (
                          <span className="text-slate-500 font-semibold text-xs italic">Proof Under Review</span>
                        )}
                        {item.status === 'RESOLVED' && (
                          <span className="text-slate-400 font-bold text-xs">Closed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal 1: Acknowledge Ticket */}
          {selectedTicket && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white border-2 border-slate-300 rounded-xl p-8 max-w-lg w-full relative shadow-2xl">
                <button onClick={() => setSelectedTicket(null)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-800">
                  <X className="w-6 h-6" />
                </button>
                <h3 className="text-xl font-bold text-[#0b3c5d]">Acknowledge Incident #{selectedTicket.ticket_id}</h3>
                <p className="text-sm font-semibold text-slate-600 mt-1 mb-6 border-b border-slate-200 pb-3">{selectedTicket.category}</p>

                <form onSubmit={handleAcknowledge} className="space-y-5 text-sm">
                  <div>
                    <label className="block text-slate-700 font-bold mb-2">Responding Officer Name / ID</label>
                    <input
                      type="text"
                      value={officerName}
                      onChange={(e) => setOfficerName(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 font-bold text-base outline-none focus:border-[#0b3c5d]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-2">Committed Resolution Window</label>
                    <select
                      value={deadlineHours}
                      onChange={(e) => setDeadlineHours(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 font-bold text-sm outline-none focus:border-[#0b3c5d]"
                    >
                      <option value={2}>Within 2 Hours (Emergency)</option>
                      <option value={4}>Within 4 Hours (Standard SLA)</option>
                      <option value={8}>Within 8 Hours (Same Day)</option>
                      <option value={24}>Within 24 Hours</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-slate-200 mt-6">
                    <button type="button" onClick={() => setSelectedTicket(null)} className="flex-1 py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm">Cancel</button>
                    <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-lg bg-[#0b3c5d] hover:bg-[#07273d] text-white font-bold text-sm shadow-md">
                      {submitting ? "Saving..." : "Confirm & Set Deadline"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal 2: Geo-Tagged Resolution Photo Proof */}
          {resolvingTicket && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white border-2 border-slate-300 rounded-xl p-8 max-w-lg w-full relative shadow-2xl">
                <button onClick={() => setResolvingTicket(null)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-800">
                  <X className="w-6 h-6" />
                </button>

                <div className="flex items-center gap-3 pb-3 border-b border-slate-200 mb-5">
                  <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#0b3c5d]">Upload Field Resolution Proof</h3>
                    <p className="text-xs text-slate-500 font-semibold">Incident #{resolvingTicket.ticket_id}</p>
                  </div>
                </div>

                <form onSubmit={handleProofSubmit} className="space-y-4 text-sm">
                  {/* Photo Input */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">
                      Capture / Upload Completion Photo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => setProofImage(e.target.files[0])}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-semibold text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-[#0b3c5d] file:text-white hover:file:bg-[#07273d]"
                    />
                  </div>

                  {/* Auto-detected Geo-Tag Display */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <p className="font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                      <MapPin className="w-4 h-4 text-red-600" /> Auto-Tagged Field Geo-Coordinates
                    </p>
                    {isLocating ? (
                      <span className="text-slate-500 italic">Acquiring high-accuracy GPS coordinates...</span>
                    ) : (
                      <span className="font-mono text-slate-800 font-bold">
                        Lat: {proofCoords.lat?.toFixed(5)}° N, Lng: {proofCoords.lng?.toFixed(5)}° E
                      </span>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5">Officer Field Inspection Notes</label>
                    <textarea
                      value={resolvedNotes}
                      onChange={(e) => setResolvedNotes(e.target.value)}
                      placeholder="e.g. Broken pipe replaced, asphalt repaired and inspected."
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 font-medium text-xs outline-none focus:border-[#0b3c5d]"
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    <button type="button" onClick={() => setResolvingTicket(null)} className="flex-1 py-3 rounded-lg bg-slate-100 text-slate-700 font-bold text-sm">
                      Cancel
                    </button>
                    <button type="submit" disabled={uploadingProof || isLocating} className="flex-1 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md">
                      {uploadingProof ? "Submitting Proof..." : "Submit for Admin Review"}
                    </button>
                  </div>
                </form>
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