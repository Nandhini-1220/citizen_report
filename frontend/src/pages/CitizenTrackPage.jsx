import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  MapPin, 
  Users, 
  Building2, 
  FileText,
  Radio,
  Check,
  ShieldCheck,
  PhoneCall,
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
      setError("Reference record not found in the municipal registry.");
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
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl border border-slate-300 shadow-md text-center max-w-md w-full">
          <div className="w-10 h-10 border-4 border-[#0b3c5d] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800">Accessing Municipal Ledger</h2>
          <p className="text-sm text-slate-500 mt-1">Verifying official grievance records...</p>
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white border-2 border-red-200 p-8 rounded-xl max-w-lg w-full text-center shadow-md">
          <AlertCircle className="w-14 h-14 text-red-600 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-slate-900">Record Not Found</h2>
          <p className="text-base text-slate-600 mt-2 mb-6">
            Grievance tracking ticket <strong>#{ticketId}</strong> was not found in the system registry.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 bg-[#0b3c5d] hover:bg-[#07273d] text-white rounded-lg text-base font-bold shadow-md transition"
          >
            Return to Citizen Helpline
          </button>
        </div>
      </div>
    );
  }

  const isAck = complaint.status === 'ACKNOWLEDGED' || complaint.status === 'RESOLVED';
  const isRes = complaint.status === 'RESOLVED';

  const steps = [
    {
      title: "1. Grievance Registered & AI Dispatched",
      desc: "Voice transcription converted, location tagged, and filed into department work queue.",
      date: complaint.created_at,
      isCompleted: true
    },
    {
      title: "2. Officer Assigned & SLA Target Set",
      desc: complaint.assigned_officer 
        ? `Claimed by Officer ${complaint.assigned_officer} (${complaint.department?.name || complaint.department || "Municipal Operations"})`
        : "Awaiting formal review and assignment from departmental officer.",
      date: complaint.acknowledged_at,
      isCompleted: isAck
    },
    {
      title: "3. Field Completion & Redressal Closed",
      desc: isRes
        ? "Work inspected and closed in accordance with municipal citizen standards."
        : "Pending completion by on-site field team.",
      date: complaint.resolved_at,
      isCompleted: isRes
    }
  ];

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-800 flex flex-col justify-between font-sans">
      <div>
        {/* National Tricolor Top Strip */}
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-white to-green-600 w-full" />
        
        {/* Official Header Strip */}
        <div className="bg-[#0b3c5d] text-white py-2 px-6 text-xs md:text-sm flex justify-between items-center font-bold tracking-wide">
          <span>GOVERNMENT OF CITIZEN SERVICES • GRIEVANCE AUDIT LEDGER</span>
          <span className="font-mono">SYS REF: #{complaint.ticket_id}</span>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          
          {/* Navigation Bar */}
          <div className="flex items-center justify-between mb-6">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-sm font-bold text-[#0b3c5d] hover:text-blue-800 transition"
            >
              <ArrowLeft className="w-5 h-5" /> Back to Citizen Helpline
            </Link>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-200 px-3 py-1 rounded">
              Live Public Ledger
            </span>
          </div>

          {/* Primary Ticket Overview Card */}
          <div className="bg-white border border-slate-300 rounded-xl shadow-md p-6 md:p-8 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Official Grievance Reference
                </span>
                <h1 className="text-3xl md:text-4xl font-extrabold font-mono text-[#0b3c5d] mt-1">
                  #{complaint.ticket_id}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-4 py-1.5 rounded-md text-sm font-bold uppercase tracking-wider border shadow-sm ${
                  isRes 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                    : isAck
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {complaint.status}
                </span>

                {complaint.urgency === 'Emergency' && (
                  <span className="px-3.5 py-1.5 rounded-md text-sm font-bold bg-red-100 text-red-700 border border-red-300 animate-pulse">
                    HIGH PRIORITY
                  </span>
                )}
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm mb-6">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Designated Department</p>
                <p className="text-base font-bold text-slate-900 flex items-center gap-2 mt-1.5">
                  <Building2 className="w-5 h-5 text-[#0b3c5d] shrink-0" />
                  {complaint.department?.name || complaint.department || "Municipal Operations"}
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Location Jurisdiction</p>
                <p className="text-base font-bold text-slate-900 flex items-center gap-2 mt-1.5">
                  <MapPin className="w-5 h-5 text-red-600 shrink-0" />
                  <span className="truncate">{complaint.location_name || `${complaint.lat?.toFixed(4)}, ${complaint.lng?.toFixed(4)}`}</span>
                </p>
              </div>
            </div>

            {/* Official Summary Box */}
            <div className="mb-4">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">
                Official Voice Transcript Summary
              </p>
              <div className="text-base text-slate-800 bg-slate-50 p-5 rounded-lg border border-slate-200 leading-relaxed font-medium">
                {complaint.summary}
              </div>
            </div>

            {/* Multi-Caller Cluster Box */}
            {complaint.report_count > 1 && (
              <div className="flex items-center gap-3 text-sm text-amber-900 bg-amber-50 border border-amber-300 p-4 rounded-lg mt-4 font-semibold">
                <Users className="w-5 h-5 text-amber-700 shrink-0" />
                <span>Geographic Cluster: Reported by <strong>{complaint.report_count} citizens</strong> in this immediate neighborhood.</span>
              </div>
            )}
          </div>

          {/* Official SLA Target Card */}
          {complaint.deadline_set && complaint.status !== 'RESOLVED' && (
            <div className="bg-white border-l-8 border-l-[#0b3c5d] border border-slate-300 rounded-xl p-6 mb-8 shadow-md flex items-start gap-4">
              <Clock className="w-7 h-7 text-[#0b3c5d] mt-1 shrink-0" />
              <div>
                <p className="text-xs uppercase font-bold text-[#0b3c5d] tracking-wider">Committed Citizen Charter SLA Window</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  Target Completion by: {new Date(complaint.deadline_set).toLocaleDateString()} at {new Date(complaint.deadline_set).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-sm font-semibold text-slate-600 mt-1">
                  Assigned Officer: <span className="text-slate-900 font-bold">Officer {complaint.assigned_officer || "Assigned Officer"}</span>
                </p>
              </div>
            </div>
          )}

          {/* Status Progression Workflow Timeline */}
          <div className="bg-white border border-slate-300 rounded-xl p-6 md:p-8 shadow-md">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-3 mb-6">
              Citizen Charter Audit Progression
            </h3>

            <div className="space-y-8 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-1 before:bg-slate-200">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-5 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 z-10 shadow-sm ${
                    step.isCompleted 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-200 text-slate-600 border border-slate-300'
                  }`}>
                    {step.isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : idx + 1}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <p className={`text-base font-bold ${step.isCompleted ? 'text-slate-900' : 'text-slate-500'}`}>
                        {step.title}
                      </p>
                      {step.date && (
                        <span className="text-xs text-slate-500 font-mono font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {new Date(step.date).toLocaleDateString()} {new Date(step.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed font-medium">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Official Government Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs md:text-sm text-slate-600 font-medium">
        Municipal Corporation Automated Citizen Grievance Redressal System • Official Public Portal
      </footer>
    </div>
  );
}