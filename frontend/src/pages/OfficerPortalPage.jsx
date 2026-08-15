import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Building, 
  MapPin, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  LogOut,
  RefreshCw,
  FileCheck
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Officer Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-400" />
              <h1 className="text-xl font-bold text-white">Department Action Portal</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Logged in as <span className="text-slate-200 font-semibold">{officerName}</span> • Assigned to <span className="text-blue-400 font-semibold">{department}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            
             <select
  value={department}
  onChange={(e) => {
    setDepartment(e.target.value);
    localStorage.setItem('officer_department', e.target.value);
  }}
  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded px-3 py-2 focus:outline-none"
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
              onClick={handleLogout}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>

        {/* Complaints Table / Queue */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Assigned Department Incidents ({complaints.length})
            </h2>
            <button 
              onClick={fetchTickets}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          {complaints.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No pending complaints currently assigned to this department.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950 text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Ticket ID</th>
                    <th className="p-3">Category & Summary</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Callers</th>
                    <th className="p-3">Status / SLA</th>
                    <th className="p-3 text-right">Officer Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-sans">
                  {complaints.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-blue-400">
                        #{item.ticket_id}
                      </td>
                      <td className="p-3 max-w-sm">
                        <p className="font-semibold text-slate-200 text-xs">{item.category}</p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{item.summary}</p>
                      </td>
                      <td className="p-3 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{item.location_name || `${item.lat.toFixed(3)}, ${item.lng.toFixed(3)}`}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          item.urgency === 'Emergency' ? 'bg-red-950 text-red-300 border border-red-800' :
                          item.urgency === 'High' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {item.urgency}
                        </span>
                      </td>
                      <td className="p-3">
                        {item.report_count > 1 ? (
                          <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 text-xs font-bold rounded flex items-center gap-1 w-fit">
                            <Users className="w-3 h-3" /> {item.report_count}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">1</span>
                        )}
                      </td>
                      <td className="p-3 text-xs">
                        <span className="font-semibold text-slate-200">{item.status}</span>
                        {item.deadline_set && item.status !== 'RESOLVED' && (
                          <p className="text-[11px] text-blue-400 mt-0.5">
                            Target: {new Date(item.deadline_set).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {item.status === 'REGISTERED' && (
                          <button
                            onClick={() => setSelectedTicket(item)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
                          >
                            Acknowledge
                          </button>
                        )}
                        {item.status === 'ACKNOWLEDGED' && (
                          <button
                            onClick={() => handleResolve(item.ticket_id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1 ml-auto"
                          >
                            <FileCheck className="w-3.5 h-3.5" /> Mark Resolved
                          </button>
                        )}
                        {item.status === 'RESOLVED' && (
                          <span className="text-xs text-slate-500 font-medium">Closed</span>
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
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-md w-full space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">
                  Acknowledge Ticket #{selectedTicket.ticket_id}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedTicket.category}</p>
              </div>

              <form onSubmit={handleAcknowledge} className="space-y-4 text-sm">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">
                    Responding Officer Name / ID
                  </label>
                  <input
                    type="text"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    required
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-200 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">
                    Target Completion Window (SLA Commitment)
                  </label>
                  <select
                    value={deadlineHours}
                    onChange={(e) => setDeadlineHours(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-200 text-sm focus:outline-none"
                  >
                    <option value={2}>Within 2 Hours (Urgent Priority)</option>
                    <option value={4}>Within 4 Hours (Standard)</option>
                    <option value={8}>Within 8 Hours (Same Day)</option>
                    <option value={24}>Within 24 Hours</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    disabled={submitting}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
                  >
                    {submitting ? "Saving..." : "Confirm & Set Deadline"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}