import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  MapPin, 
  Users, 
  Building, 
  FileText,
  UserCheck
} from 'lucide-react';

export default function CitizenTrackPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`http://localhost:8001/api/complaints/${ticketId}`);
      setComplaint(res.data);
      setError(null);
    } catch (err) {
      setError("Ticket not found or network error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [ticketId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <p className="text-sm font-medium text-slate-400">Loading grievance record...</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg max-w-md w-full text-center">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold">Grievance Not Found</h2>
          <p className="text-sm text-slate-400 mt-1">
            Reference ticket #{ticketId} is not in the system.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium"
          >
            Back to Helpline
          </button>
        </div>
      </div>
    );
  }

  const steps = [
    {
      title: "1. Intake Registered",
      desc: "Voice recording processed & routed to department",
      date: complaint.created_at,
      isCompleted: true
    },
    {
      title: "2. Officer Acknowledged",
      desc: complaint.assigned_officer 
        ? `Claimed by Officer ${complaint.assigned_officer} (${complaint.department})`
        : "Awaiting review from departmental officer",
      date: complaint.acknowledged_at,
      isCompleted: complaint.status !== "REGISTERED"
    },
    {
      title: "3. Resolved & Closed",
      desc: complaint.status === "RESOLVED"
        ? "Work inspected and closed by assigned officer"
        : "Pending completion by field team",
      date: complaint.resolved_at,
      isCompleted: complaint.status === "RESOLVED"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-3xl space-y-6">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Citizen Helpline
          </button>
          <span className="text-xs font-mono text-slate-500">
            System ID: {complaint.ticket_id}
          </span>
        </div>

        {/* Primary Ticket Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Grievance Reference
              </span>
              <h1 className="text-2xl font-bold font-mono text-white mt-0.5">
                #{complaint.ticket_id}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                complaint.status === 'RESOLVED' 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                  : complaint.status === 'ACKNOWLEDGED'
                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {complaint.status}
              </span>
              {complaint.urgency === 'Emergency' && (
                <span className="px-2.5 py-1 rounded text-xs font-bold bg-red-950 text-red-300 border border-red-800">
                  CRITICAL
                </span>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-2">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Department</p>
              <p className="text-slate-200 font-medium flex items-center gap-1.5 mt-0.5">
                <Building className="w-4 h-4 text-slate-400" /> {complaint.department}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Location</p>
              <p className="text-slate-200 font-medium flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-4 h-4 text-slate-400" /> 
                {complaint.location_name || `${complaint.lat.toFixed(4)}, ${complaint.lng.toFixed(4)}`}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs text-slate-500 font-semibold uppercase">Official Transcript Summary</p>
            <p className="text-sm text-slate-300 mt-1 bg-slate-950 p-3 rounded border border-slate-800 leading-relaxed">
              {complaint.summary}
            </p>
          </div>

          {complaint.report_count > 1 && (
            <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-950/40 border border-amber-900/60 p-2.5 rounded">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>Reported by {complaint.report_count} citizens in this immediate area.</span>
            </div>
          )}
        </div>

        {/* SLA Commitment Box */}
        {complaint.deadline_set && complaint.status !== 'RESOLVED' && (
          <div className="bg-slate-900 border-l-4 border-l-blue-500 border border-slate-800 rounded-r-lg p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs uppercase font-bold text-blue-400">Official Department Target Deadline</p>
              <p className="text-sm font-semibold text-white mt-0.5">
                Target Resolution by: {new Date(complaint.deadline_set).toLocaleDateString()} at {new Date(complaint.deadline_set).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Handled by: Officer {complaint.assigned_officer || "Assigned Officer"}
              </p>
            </div>
          </div>
        )}

        {/* Workflow Progression (Formal Step List) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
          <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
            Audit Trail & Status Progression
          </h3>

          <div className="space-y-4 pt-2">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  step.isCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
                }`}>
                  {step.isCompleted ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold ${step.isCompleted ? 'text-slate-200' : 'text-slate-500'}`}>
                      {step.title}
                    </p>
                    {step.date && (
                      <span className="text-xs text-slate-500 font-mono">
                        {new Date(step.date).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}