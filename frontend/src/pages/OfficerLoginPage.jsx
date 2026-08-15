import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Building2, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export default function OfficerLoginPage() {
  const navigate = useNavigate();
  const [department, setDepartment] = useState('Water Supply');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const departments = [
    { id: 'Water Supply', label: 'Water Supply & Pipelines' },
    { id: 'Road Maintenance', label: 'Roads & Infrastructure' },
    { id: 'Gas & Energy', label: 'Gas, Pipeline & Energy' },
    { id: 'Sanitation', label: 'Sewage & Waste Management' },
    { id: 'Electricity Board', label: 'Electricity & Grid Board' },
    { id: 'Public Safety', label: 'Public Safety & Enforcement' },
  ];

  const handleLogin = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and access token.');
      return;
    }
    // Store department context for the active session
    localStorage.setItem('officer_department', department);
    localStorage.setItem('officer_name', username);
    navigate('/officer/portal');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Officer Authorization</h1>
          <p className="text-sm text-slate-400">Sign in to your departmental triage workspace</p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Department</label>
            <div className="relative mt-1">
              <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Officer ID / Badge</label>
            <input
              type="text"
              placeholder="e.g. OFF-8821"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              className="w-full mt-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
            />
          </div>

          <div>
            <label className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Access Token / Password</label>
            <div className="relative mt-1">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/30"
          >
            Access Triage Queue <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2">
          <a href="/" className="text-xs text-slate-500 hover:text-slate-300 transition">
            ← Return to Citizen Voice Helpline
          </a>
        </div>
      </div>
    </div>
  );
}