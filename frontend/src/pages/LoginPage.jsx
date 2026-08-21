import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, ArrowLeft, Lock, User, AlertCircle, KeyRound, Building2 } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Direct Authentication Check
      if (username === 'admin' && password === 'admin123') {
        localStorage.setItem('auth_role', 'admin');
        localStorage.setItem('officer_name', 'System Administrator');
        localStorage.setItem('officer_department', 'All');
        navigate('/admin');
        return;
      }

      if (username === 'water_admin' && password === 'water123') {
        localStorage.setItem('auth_role', 'officer');
        localStorage.setItem('officer_name', 'Water Works Officer');
        localStorage.setItem('officer_department', 'Water Supply');
        navigate('/officer/portal');
        return;
      }

      // Backend API Authentication Attempt
      const res = await axios.post('http://localhost:8001/api/auth/login', {
        username,
        password
      });

      if (res.data.role === 'admin') {
        localStorage.setItem('auth_role', 'admin');
        localStorage.setItem('officer_name', res.data.name || 'Administrator');
        localStorage.setItem('officer_department', 'All');
        navigate('/admin');
      } else {
        localStorage.setItem('auth_role', 'officer');
        localStorage.setItem('officer_name', res.data.name || username);
        localStorage.setItem('officer_department', res.data.department || 'Water Supply');
        navigate('/officer/portal');
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid municipal credentials. Please check username and password.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (user, pass) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-800 flex flex-col justify-between font-sans">
      <div>
        {/* Tricolor National Strip */}
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-white to-green-600 w-full" />

        {/* Top Header Banner */}
        <div className="bg-[#0b3c5d] text-white py-2 px-6 text-xs md:text-sm flex justify-between items-center font-bold tracking-wide">
          <span>GOVERNMENT OF CITIZEN SERVICES • OFFICIAL ACCESS GATEWAY</span>
          <span className="hidden md:inline">AUTHENTICATED PERSONNEL ONLY</span>
        </div>

        <div className="max-w-xl mx-auto px-4 py-10">
          
          {/* Back Button */}
          <div className="mb-6">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-sm font-bold text-[#0b3c5d] hover:text-blue-800 transition"
            >
              <ArrowLeft className="w-5 h-5" /> Back to Citizen Helpline
            </Link>
          </div>

          {/* Login Card */}
          <div className="bg-white border-2 border-slate-300 rounded-xl shadow-lg p-8 md:p-10">
            
            {/* Emblem Header */}
            <div className="text-center pb-6 border-b border-slate-200 mb-6">
              <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-[#0b3c5d] flex items-center justify-center mx-auto mb-3 shadow-inner">
                <ShieldCheck className="w-9 h-9 text-[#0b3c5d]" />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#0b3c5d] tracking-tight">
                Staff & Official Login
              </h1>
              <p className="text-sm font-semibold text-slate-500 mt-1">
                Municipal Officers & Administration Workspace
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg flex items-start gap-3 text-sm text-red-700 font-semibold">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Official Username / Employee ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="e.g. admin or water_admin"
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-lg pl-11 pr-4 py-3 text-slate-900 font-bold text-base focus:bg-white focus:border-[#0b3c5d] outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border-2 border-slate-300 rounded-lg pl-11 pr-4 py-3 text-slate-900 font-bold text-base focus:bg-white focus:border-[#0b3c5d] outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-lg bg-[#0b3c5d] hover:bg-[#07273d] text-white font-extrabold text-base tracking-wide shadow-md transition disabled:opacity-50 mt-2"
              >
                {loading ? "Authenticating Official..." : "Sign In to Official Workspace"}
              </button>
            </form>

            {/* Quick Demo Credentials Box */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-3">
                <KeyRound className="w-4 h-4 text-[#0b3c5d]" /> Quick Demo Accounts (Click to Fill)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => fillDemo('admin', 'admin123')}
                  className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-300 hover:border-[#0b3c5d] rounded-lg text-left transition"
                >
                  <p className="font-bold text-[#0b3c5d]">Administrator</p>
                  <p className="text-slate-600 mt-0.5 font-mono">admin / admin123</p>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemo('water_admin', 'water123')}
                  className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-300 hover:border-[#0b3c5d] rounded-lg text-left transition"
                >
                  <p className="font-bold text-[#0b3c5d]">Water Supply Officer</p>
                  <p className="text-slate-600 mt-0.5 font-mono">water_admin / water123</p>
                </button>
              </div>
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