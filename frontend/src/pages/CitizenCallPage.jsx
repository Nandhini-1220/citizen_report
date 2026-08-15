import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Phone, PhoneOff, Mic, MapPin, CheckCircle2, Radio, Loader2 } from 'lucide-react';

export default function CitizenCallPage() {
  const [inCall, setInCall] = useState(false);
  const [timer, setTimer] = useState(0);
  const [phone, setPhone] = useState('+91 98401 23456');
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  const startCall = async () => {
    try {
      // 1. Fetch exact mobile GPS coordinates
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords({ lat: 13.0827, lng: 80.2707 }) // Default fallback
      );

      // 2. Open browser microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setInCall(true);
      setTimer(0);
      timerIntervalRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } catch (err) {
      alert('Microphone permission is required to speak with the helpline.');
    }
  };

  const endCall = () => {
    if (!mediaRecorderRef.current) return;
    clearInterval(timerIntervalRef.current);
    setInCall(false);
    setLoading(true);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'call_recording.webm');
      formData.append('caller_phone', phone);
      formData.append('lat', String(coords?.lat || 13.0827));
      formData.append('lng', String(coords?.lng || 80.2707));

      try {
        const response = await axios.post('http://localhost:8001/api/complaints/call-ingest', formData);
        setResult(response.data);
      } catch (err) {
        alert('Failed to process call. Please check your backend connection.');
      } finally {
        setLoading(false);
      }
    };

    mediaRecorderRef.current.stop();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> 24/7 AI Voice Intake
          </span>
          <h1 className="text-2xl font-bold mt-2">Municipal Helpline</h1>
          <p className="text-sm text-slate-400">Speak naturally in your native language</p>
        </div>

        {!inCall && !loading && !result && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 uppercase font-medium">Your Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full mt-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              onClick={startCall}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl flex items-center justify-center gap-3 transition shadow-lg shadow-emerald-900/30"
            >
              <Phone className="w-6 h-6" /> Start Voice Report
            </button>
          </div>
        )}

        {inCall && (
          <div className="text-center py-8 space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse border-2 border-emerald-500">
              <Mic className="w-10 h-10 text-emerald-400 animate-bounce" />
            </div>
            <div>
              <div className="text-3xl font-mono font-bold text-emerald-400">
                00:{timer < 10 ? `0${timer}` : timer}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-400" /> GPS: {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Locking...'}
              </p>
            </div>
            <button
              onClick={endCall}
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl flex items-center justify-center gap-3 transition shadow-lg shadow-red-900/30"
            >
              <PhoneOff className="w-6 h-6" /> End Call & Register
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-12 space-y-4">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
            <p className="font-semibold text-slate-300">Transcribing speech & analyzing incident...</p>
          </div>
        )}

        {result && (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h3 className="font-bold text-lg text-emerald-200">
                {result.status === 'MERGED_DUPLICATE' ? 'Merged with Existing Incident' : 'Complaint Registered!'}
              </h3>
              <p className="text-xs text-slate-300 mt-1">Ticket #{result.complaint.ticket_id}</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl space-y-2 text-sm border border-slate-800">
              <div><strong className="text-slate-400">Category:</strong> {result.complaint.category}</div>
              <div><strong className="text-slate-400">Summary:</strong> {result.complaint.summary}</div>
              <div><strong className="text-slate-400">Total Callers:</strong> {result.complaint.report_count} Citizen(s)</div>
            </div>

            <a
              href={`/track/${result.complaint.ticket_id}`}
              className="block w-full py-3 bg-slate-800 hover:bg-slate-700 text-center rounded-xl font-medium text-sm transition"
            >
              Open Live Ticket Timeline Tracker →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}