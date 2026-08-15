import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CitizenCallPage from './pages/CitizenCallPage';
import CitizenTrackPage from './pages/CitizenTrackPage';
import OfficerLoginPage from './pages/OfficerLoginPage';
import OfficerPortalPage from './pages/OfficerPortalPage';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Citizen Portal */}
        <Route path="/" element={<CitizenCallPage />} />
        <Route path="/track/:ticketId" element={<CitizenTrackPage />} />

        {/* 2. Department Officer Workspace */}
        <Route path="/officer/login" element={<OfficerLoginPage />} />
        <Route path="/officer/portal" element={<OfficerPortalPage />} />

        {/* 3. Municipal Command Center */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}