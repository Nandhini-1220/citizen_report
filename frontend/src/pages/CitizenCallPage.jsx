import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Mic, 
  Square, 
  MapPin, 
  Phone, 
  AlertCircle, 
  CheckCircle, 
  Building, 
  ShieldCheck, 
  ArrowRight, 
  RefreshCw, 
  Radio,
  Lock,
  UserCheck
} from 'lucide-react';

export default function CitizenCallPage() {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('9042738066');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [location, setLocation] = useState({ lat: 13.0827, lng: 80.2707, address: 'Locating via GPS...' });
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Initialize GPS on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            const addr = data.display_name ? data.display_name.split(',').slice(0, 3).join(',') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            setLocation({ lat, lng, address: addr });
          } catch {
            setLocation({ lat, lng, address: `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
          }
        },
        () => {
          setLocation({ lat: 13.0827, lng: 80.2707, address: 'Mohanapuri 4th Street, Chennai (Default)' });
        }
      );
    }
  }, []);

  const startRecording = async () => {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        submitVoiceComplaint(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError("Microphone permission denied. Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const submitVoiceComplaint = async (audioBlob) => {
    setProcessing(true);
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('caller_phone', phoneNumber);
    formData.append('lat', String(location.lat));
    formData.append('lng', String(location.lng));

    try {
      const res = await axios.post('http://localhost:8001/api/complaints/call-ingest', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to process voice complaint. Ensure backend is running.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      
      {/* Top Header with Prominent Staff Login Button */}
      <header className="w-full border-b border-slate-800/80 bg-slate-900/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">CITIZEN GRIEVANCE HELPLINE</h1>
            <p className="text-[11px] text-slate-400">Municipal AI Voice Redressal Portal</p>
          </div>
        </div>

        {/* Prominent Login Button */}
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
        >
          <Lock className="w-3.5 h-3.5 text-blue-400" />
          <span>Staff & Official Login</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
          
          <div className="text-center space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Radio className="w-3.5 h-3.5" /> 24/7 AI Voice Intake
            </span>
            <h2 className="text-xl font-bold text-white pt-2">Record Your Grievance</h2>
            <p className="text-xs text-slate-400">Speak naturally in Tamil, Hindi, English, or Telugu</p>
          </div>

          {/* Caller Location Box */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-400 font-semibold uppercase">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Caller Location
              </span>
              <span className="text-[10px] text-slate-500">Auto-Detected</span>
            </div>
            <p className="text-slate-200 font-medium truncate">{location.address}</p>
            <p className="text-[11px] text-slate-500 font-mono">GPS: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
          </div>

          {/* Phone Number Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase">
              Your Mobile Number (For Live SMS Updates)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Recording & Action Controls */}
          <div className="pt-2">
            {!isRecording && !processing && (
              <button
                onClick={startRecording}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition"
              >
                <Mic className="w-4 h-4" /> Start Voice Report
              </button>
            )}

            {isRecording && (
              <button
                onClick={stopRecording}
                className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition"
              >
                <Square className="w-4 h-4 fill-current" /> Stop & Submit Recording ({recordingTime}s)
              </button>
            )}

            {processing && (
              <div className="w-full py-3.5 bg-slate-800 text-slate-300 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 border border-slate-700">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                Analyzing Speech & Routing Department...
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Response Banner */}
          {result && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> 
                  {result.status === 'MERGED_DUPLICATE' ? 'Merged with Existing Ticket' : 'Ticket Created'}
                </span>
                <span className="font-mono text-xs font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  #{result.complaint.ticket_id}
                </span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-2">{result.complaint.summary}</p>
              
              <button
                onClick={() => navigate(`/track/${result.complaint.ticket_id}`)}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                Open Live Status Tracker <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-3 text-[11px] text-slate-600 border-t border-slate-900">
        Municipal Corporation Automated Citizen Grievance Redressal System
      </footer>

    </div>
  );
}