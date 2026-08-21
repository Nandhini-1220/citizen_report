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
  FileCheck,
  X,
  Radio,
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
  
  // Modal state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [deadlineHours, setDeadlineHours] = useState(4);
  const [submitting, setSubmitting] = useState(false);

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
      alert("Failed to acknowledge ticket. Check backend connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (ticketId) => {
    if (!window.confirm(`Confirm resolution of ticket #${ticketId}?`)) return;
    try {
      await axios.post(`http://localhost:8001/api/officer/resolve/${ticketId}`);
      fetchTickets();
    } catch (err) {
      alert("Failed to mark ticket resolved.");
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
        {/* Tricolor National Bar */}
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-white to-green-600 w-full" />

        {/* Top Official Banner */}
        <div className="bg-[#0b3c5d] text-white py-2 px-6 text-xs md:text-sm flex justify-between items-center font-bold tracking-wide">
          <span>GOVERNMENT OF CITIZEN SERVICES • OFFICIAL DEPARTMENT WORKSPACE</span>
          <span>OFFICER IN-CHARGE: {officerName.toUpperCase()}</span>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          
          {/* Header Action Card */}
          <header className="bg-white border border-slate-300 rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-[#0b3c5d]">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-[#0b3c5d] tracking-tight">
                  Department Action & Triage Portal
                </h1>
                <p className="text-sm text-slate-600 mt-1 font-medium">
                  Logged in as <span className="font-bold text-slate-900">{officerName}</span> • Assigned Zone: <span className="font-bold text-[#0b3c5d]">{department}</span>
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
                className="bg-white border-2 border-slate-300 text-sm font-bold text-slate-800 rounded-lg px-4 py-2.5 outline-none focus:border-[#0b3c5d] transition shadow-sm"
              >
                <option value="All">All Departments (Overview)</option>
                <option value="Water Supply">Water Supply</option>
                <option value="Road Maintenance">Road Maintenance</option>
                <option value="Gas & Energy">Gas & Energy</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Electricity Board">Electricity Board</option>
                <option value="Public Safety">Public Safety</option>
              </select>

              <button
                onClick={fetchTickets}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-700 transition shadow-sm"
                title="Refresh Queue"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <button
                onClick={handleLogout}
                className="px-4 py-2.5 bg-white hover:bg-red-50 text-red-700 rounded-lg text-sm font-bold flex items-center gap-2 border border-red-300 transition shadow-sm"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </header>

          {/* Complaints Table Queue */}
          <div className="bg-white border border-slate-300 rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Assigned Department Work Orders ({complaints.length})
              </h2>
              <span className="text-xs font-semibold text-slate-500">Live Auto-Sync (5s)</span>
            </div>

            {loading && complaints.length === 0 ? (
              <div className="p-16 text-center text-slate-500 text-base font-semibold flex items-center justify-center gap-3">
                <Radio className="w-5 h-5 text-blue-600 animate-pulse" />
                <span>Loading active department incidents...</span>
              </div>
            ) : complaints.length === 0 ? (
              <div className="p-16 text-center text-slate-500 text-base font-semibold">
                No active complaints currently assigned to this department queue.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-800">
                  <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-300 text-xs">
                    <tr>
                      <th className="py-4 px-5">Ticket ID</th>
                      <th className="py-4 px-5">Category & Summary</th>
                      <th className="py-4 px-5">Location</th>
                      <th className="py-4 px-5">Priority</th>
                      <th className="py-4 px-5 text-center">Subscribers</th>
                      <th className="py-4 px-5">Status / SLA</th>
                      <th className="py-4 px-5 text-right">Official Action</th>
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
                          <p className="text-slate-600 line-clamp-2 text-xs mt-1 leading-relaxed font-medium">
                            {item.summary}
                          </p>
                        </td>
                        <td className="py-4 px-5 text-slate-700 font-medium text-xs">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                            <span className="truncate max-w-[140px]">
                              {item.location_name || `${item.lat?.toFixed(3)}, ${item.lng?.toFixed(3)}`}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <span className={`px-2.5 py-1 rounded text-xs font-extrabold uppercase tracking-wider border shadow-sm ${
                            item.urgency === 'Emergency' ? 'bg-red-100 text-red-800 border-red-300' :
                            item.urgency === 'High' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                            'bg-slate-100 text-slate-700 border-slate-300'
                          }`}>
                            {item.urgency}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center font-bold text-slate-700">
                          {item.report_count > 1 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded font-mono text-xs font-extrabold">
                              <Users className="w-3.5 h-3.5 text-amber-700" /> {item.report_count}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono text-sm font-semibold">1</span>
                          )}
                        </td>
                        <td className="py-4 px-5">
                          {item.status === 'RESOLVED' ? (
                            <span className="text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded font-bold text-xs">
                              RESOLVED
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
                              onClick={() => handleResolve(item.ticket_id)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 ml-auto shadow-md transition"
                            >
                              <FileCheck className="w-4 h-4" /> Mark Resolved
                            </button>
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
            )}
          </div>

          {/* Modal: Acknowledge & Set SLA Deadline */}
          {selectedTicket && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white border-2 border-slate-300 rounded-xl p-8 max-w-lg w-full relative shadow-2xl">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-800 rounded-md"
                >
                  <X className="w-6 h-6" />
                </button>

                <h3 className="text-xl font-bold text-[#0b3c5d]">
                  Acknowledge Work Order #{selectedTicket.ticket_id}
                </h3>
                <p className="text-sm font-semibold text-slate-600 mt-1 mb-6 border-b border-slate-200 pb-3">
                  {selectedTicket.category}
                </p>

                <form onSubmit={handleAcknowledge} className="space-y-5 text-sm">
                  <div>
                    <label className="block text-slate-700 font-bold mb-2">
                      Responding Field Officer Name / Badge ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={officerName}
                      onChange={(e) => setOfficerName(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 font-bold text-base outline-none focus:border-[#0b3c5d]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-2">
                      Citizen Charter Committed Resolution Window <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={deadlineHours}
                      onChange={(e) => setDeadlineHours(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 font-bold text-sm outline-none focus:border-[#0b3c5d]"
                    >
                      <option value={2}>Within 2 Hours (Emergency / High Urgency)</option>
                      <option value={4}>Within 4 Hours (Standard Municipal SLA)</option>
                      <option value={8}>Within 8 Hours (Same-Day Maintenance)</option>
                      <option value={24}>Within 24 Hours (Standard Investigation)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
                    <button
                      type="button"
                      onClick={() => setSelectedTicket(null)}
                      disabled={submitting}
                      className="flex-1 py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-3 rounded-lg bg-[#0b3c5d] hover:bg-[#07273d] text-white font-bold text-sm transition shadow-md"
                    >
                      {submitting ? "Saving..." : "Confirm & Dispatch SLA"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs md:text-sm text-slate-600 font-medium">
        Municipal Corporation Automated Citizen Grievance Redressal System • Sub-Second Triage
      </footer>
    </div>
  );
}