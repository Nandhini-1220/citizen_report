import React, { useState, useEffect } from 'react';
import { Mic, MicOff, MapPin, Radio, CheckCircle2, ArrowRight, AlertCircle, HelpCircle, ShieldCheck, RefreshCw } from 'lucide-react';
import axios from 'axios';

export default function CitizenCallPage() {
  const [phone, setPhone] = useState('9042738066');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Dynamic Location State
  const [coords, setCoords] = useState({ lat: 12.9852, lng: 80.2079 });
  const [locationName, setLocationName] = useState('Detecting current live location...');
  const [locating, setLocating] = useState(true);

  // Fetch real device location
  const detectLiveLocation = () => {
    setLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });

          // Try reverse geocoding via OpenStreetMap Nominatim (Free, no key required)
          try {
            const res = await axios.get(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
            );
            if (res.data && res.data.display_name) {
              const parts = res.data.display_name.split(',');
              const shortLoc = parts.slice(0, 3).join(',').trim();
              setLocationName(shortLoc || res.data.display_name);
            } else {
              setLocationName(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
            }
          } catch (e) {
            setLocationName(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
          } finally {
            setLocating(false);
          }
        },
        (err) => {
          console.warn('Geolocation error / permission denied:', err.message);
          setLocationName('CMWSSB Division 177, Ward 177, Zone 13 Adyar (Default Fallback)');
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationName('Geolocation not supported by browser');
      setLocating(false);
    }
  };

  useEffect(() => {
    detectLiveLocation();
  }, []);

  const startVoiceCapture = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks = [];

      recorder.ondataavailable = (e) => audioChunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        submitVoiceGrievance(audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      setErrorMsg("Microphone access denied. Please allow microphone permissions in your browser.");
    }
  };

  const stopVoiceCapture = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const submitVoiceGrievance = async (audioBlob) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('caller_phone', phone);
    // Send real detected GPS coordinates to the backend
    formData.append('lat', coords.lat);
    formData.append('lng', coords.lng);

    try {
      const res = await axios.post('http://localhost:8001/api/complaints/call-ingest', formData);
      setCreatedTicket(res.data.complaint);
    } catch (err) {
      const msg = err.response?.data?.detail || "Could not process grievance. Ensure voice input describes a municipal issue.";
      setErrorMsg(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col justify-between text-slate-800 font-sans">
      
      {/* Top Official National Banner */}
      <div>
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-white to-green-600 w-full" />
        <div className="bg-[#0b3c5d] text-white py-2 px-6 text-xs md:text-sm flex justify-between items-center font-bold tracking-wide">
          <span>GOVERNMENT OF CITIZEN SERVICES • MUNICIPAL ADMINISTRATION</span>
          <span className="hidden md:inline">24x7 TOLL-FREE AI HELPLINE DISPATCH</span>
        </div>

        {/* Header Branding */}
        <header className="bg-white border-b border-slate-300 shadow-sm px-6 py-4">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-[#0b3c5d] flex items-center justify-center font-bold text-xl text-[#0b3c5d] shadow-inner">
                🏛️
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-extrabold text-[#0b3c5d] leading-tight">
                  INTEGRATED CITIZEN GRIEVANCE REDRESSAL SYSTEM
                </h1>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Municipal Corporation Automated Voice Intake & SLA Action Portal
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a 
                href="/officer/login"
                className="px-4 py-2 text-xs font-bold text-white bg-[#0b3c5d] hover:bg-[#07273d] rounded-md shadow-sm transition"
              >
                Officer Login
              </a>
              <a 
                href="/login"
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition"
              >
                Admin Oversight
              </a>
            </div>
          </div>
        </header>
      </div>

      {/* Main Grievance Lodging Body */}
      <main className="max-w-5xl w-full mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Instructions */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0b3c5d] flex items-center gap-2 border-b border-slate-100 pb-2">
                <HelpCircle className="w-4 h-4 text-blue-600" /> How to Voice File
              </h3>
              <ul className="text-xs text-slate-600 space-y-2.5 mt-3 leading-relaxed font-medium">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#0b3c5d]">1.</span> 
                  Enter your active 10-digit mobile number for official SMS receipts.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#0b3c5d]">2.</span> 
                  Press <strong>"Start Voice Recording"</strong> and describe your issue in Tamil, Hindi, English, or Telugu.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#0b3c5d]">3.</span> 
                  The AI transcribes, tags your live GPS, deduplicates, and assigns an officer.
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-2.5 font-medium">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Automated Incident Guarantee</p>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  All grievances receive an instant tracking ID and SLA target resolution window.
                </p>
              </div>
            </div>
          </div>

          {/* Voice Intake Form */}
          <div className="md:col-span-2">
            <div className="bg-white border border-slate-300 rounded-xl shadow-md p-6 md:p-8">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
                <div>
                  <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-[#0b3c5d] text-[11px] font-extrabold uppercase rounded border border-blue-200 mb-1">
                    Direct Citizen Helpline
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">Lodge Municipal Grievance</h2>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 font-bold block">Languages Supported</span>
                  <span className="text-xs font-semibold text-slate-700">தமிழ் • हिंदी • English • తెలుగు</span>
                </div>
              </div>

              {/* Dynamic Live Location Badge */}
              <div className="bg-slate-50 border border-slate-300 rounded-lg p-3.5 mb-5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800">Current Detected Location: </span>
                    <span className="text-slate-700 font-semibold block mt-0.5">{locationName}</span>
                    <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                      GPS: {coords.lat.toFixed(4)}° N, {coords.lng.toFixed(4)}° E
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={detectLiveLocation}
                  disabled={locating}
                  className="p-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-600 text-xs font-bold transition flex items-center gap-1 shrink-0"
                  title="Re-fetch Current GPS Location"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh GPS</span>
                </button>
              </div>

              {/* Mobile Input */}
              <div className="mb-5 space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Citizen Mobile Number (For SMS Tracking & Feedback) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 text-sm font-bold">
                    +91
                  </span>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-12 pr-4 py-3 text-base font-bold text-slate-900 focus:bg-white focus:border-[#0b3c5d] outline-none"
                    placeholder="Enter 10-digit number"
                  />
                </div>
              </div>

              {/* Error Box */}
              {errorMsg && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700 font-semibold">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Voice Action Button */}
              {!isRecording ? (
                <button
                  onClick={startVoiceCapture}
                  disabled={isProcessing}
                  className="w-full py-4 rounded-lg bg-[#0b3c5d] hover:bg-[#07273d] text-white font-bold text-base flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
                >
                  <Mic className="w-5 h-5 text-emerald-300" />
                  {isProcessing ? "Processing Speech via Speech Engine..." : "Start Voice Recording"}
                </button>
              ) : (
                <button
                  onClick={stopVoiceCapture}
                  className="w-full py-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-base flex items-center justify-center gap-2 shadow-md animate-pulse"
                >
                  <MicOff className="w-5 h-5" />
                  Stop Recording & Submit Complaint
                </button>
              )}

              {/* Result Receipt Card */}
              {createdTicket && (
                <div className="mt-6 p-4 rounded-lg bg-emerald-50 border border-emerald-300 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-300 mb-2">
                    <span className="flex items-center gap-1.5 text-emerald-900 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Grievance Registered Successfully
                    </span>
                    <span className="font-mono bg-white text-emerald-900 px-2.5 py-0.5 rounded border border-emerald-300 font-bold text-sm">
                      #{createdTicket.ticket_id}
                    </span>
                  </div>
                  <p className="text-slate-800 mb-3 leading-relaxed font-medium">
                    <strong>Official Summary:</strong> {createdTicket.summary}
                  </p>
                  <a
                    href={`/track/${createdTicket.ticket_id}`}
                    className="w-full py-2.5 bg-[#0b3c5d] hover:bg-[#07273d] text-white rounded-md flex items-center justify-center gap-1.5 font-bold transition shadow-sm text-xs"
                  >
                    View Official Status & Audit Trail <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* Official Government Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 font-medium">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p>© 2026 Municipal Grievance Redressal Engine. Official Public Portal.</p>
          <div className="flex gap-4 text-slate-600">
            <span>Citizen Charter</span>
            <span>Privacy Policy</span>
            <span>Terms of Redressal</span>
          </div>
        </div>
      </footer>

    </div>
  );
}