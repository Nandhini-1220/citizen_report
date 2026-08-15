import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, Clock, AlertTriangle, Users, MapPin } from 'lucide-react';

export default function OfficerPortalPage() {
  const [complaints, setComplaints] = useState([]);
  const [selectedDept, setSelectedDept] = useState('Water Supply');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [deadlineHours, setDeadlineHours] = useState(4);
  const [officerName, setOfficerName] = useState('Officer R. Kumar');

  const fetchDepartmentTickets = async () => {
    try {
      const res = await axios.get(`http://localhost:8001/api/officer/tickets?dept=${selectedDept}`);
      setComplaints(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDepartmentTickets();
    const interval = setInterval(fetchDepartmentTickets, 4000);
    return () => clearInterval(interval);
  }, [selectedDept]);

  const handleAcknowledge = async (ticketId) => {
    const formData = new FormData();
    formData.append('officer_name', officerName);
    formData.append('deadline_hours', String(deadlineHours));

    await axios.post(`http://localhost:8001/api/officer/acknowledge/${ticketId}`, formData);
    setSelectedTicket(null);
    fetchDepartmentTickets();
  };

  const handleResolve = async (ticketId) => {
    await axios.post(`http://localhost:8001/api/officer/resolve/${ticketId}`);
    fetchDepartmentTickets();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Officer Action Portal</h1>
            <p className="text-slate-400 text-sm">Review, set deadlines, and resolve complaints</p>
          </div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white font-medium"
          >
            <option value="Water Supply">Water Supply</option>
            <option value="Road Maintenance">Road Maintenance</option>
            <option value="Gas & Energy">Gas & Energy</option>
            <option value="Sanitation">Sanitation</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {complaints.map((item) => (
            <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex justify-between items-center">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-emerald-400">#{item.ticket_id}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800">{item.status}</span>
                  {item.report_count > 1 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Reported by {item.report_count} Citizens
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-200">{item.summary}</p>
                <div className="text-xs text-slate-400 flex items-center gap-4">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-red-400" /> {item.lat.toFixed(4)}, {item.lng.toFixed(4)}</span>
                  <span>Registered: {new Date(item.created_at).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {item.status === 'REGISTERED' && (
                  <button
                    onClick={() => setSelectedTicket(item)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition"
                  >
                    Acknowledge & Set SLA
                  </button>
                )}
                {item.status === 'ACKNOWLEDGED' && (
                  <button
                    onClick={() => handleResolve(item.ticket_id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold transition"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal for Acknowledging & Deadline Setting */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
              <h2 className="text-lg font-bold">Acknowledge Ticket #{selectedTicket.ticket_id}</h2>
              <div>
                <label className="text-xs text-slate-400 uppercase">Responding Officer</label>
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase">Target Completion Window (Hours)</label>
                <select
                  value={deadlineHours}
                  onChange={(e) => setDeadlineHours(Number(e.target.value))}
                  className="w-full mt-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                >
                  <option value={2}>Within 2 Hours (Urgent)</option>
                  <option value={4}>Within 4 Hours</option>
                  <option value={12}>Within 12 Hours</option>
                  <option value={24}>Within 24 Hours</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="flex-1 py-2 bg-slate-800 rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAcknowledge(selectedTicket.ticket_id)}
                  className="flex-1 py-2 bg-blue-600 rounded-xl text-sm font-semibold"
                >
                  Confirm & Notify Callers
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}