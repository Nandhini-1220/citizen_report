import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Clock, CheckCircle2, AlertCircle, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function CitizenTrackPage() {
  const { ticketId } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get(`http://localhost:8001/api/complaints/${ticketId}`);
        setComplaint(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000); // 4-second live poll
    return () => clearInterval(interval);
  }, [ticketId]);

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading ticket status...</div>;
  if (!complaint) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Ticket not found.</div>;

  const steps = [
    { label: 'Registered', completed: true, time: complaint.created_at },
    { label: 'Officer Acknowledged', completed: complaint.status !== 'REGISTERED', time: complaint.acknowledged_at },
    { label: 'In Progress / Dispatched', completed: complaint.status === 'IN_PROGRESS' || complaint.status === 'RESOLVED', time: null },
    { label: 'Resolved', completed: complaint.status === 'RESOLVED', time: complaint.resolved_at },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <a href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Helpline
        </a>

        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold">Ticket #{complaint.ticket_id}</h1>
            <p className="text-sm text-emerald-400 font-medium">{complaint.category}</p>
          </div>
          <span className="px-3 py-1 bg-slate-800 text-xs rounded-full uppercase tracking-wider font-semibold">
            {complaint.status}
          </span>
        </div>

        {/* Dynamic Deadline Box */}
        {complaint.deadline_set && (
          <div className="mt-4 p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-blue-200">Promised Completion Target</p>
              <p className="text-xs text-blue-300">By {new Date(complaint.deadline_set).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Progress Timeline */}
        <div className="mt-6 space-y-6">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step.completed ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-500'}`}>
                {step.completed ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
              </div>
              <div className="flex-1">
                <p className={`font-semibold text-sm ${step.completed ? 'text-white' : 'text-slate-500'}`}>{step.label}</p>
                {step.time && <p className="text-xs text-slate-400">{new Date(step.time).toLocaleString()}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}