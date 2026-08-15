import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CitizenCallPage from './pages/CitizenCallPage';
import CitizenTrackPage from './pages/CitizenTrackPage';
import OfficerPortalPage from './pages/OfficerPortalPage';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import { ProtectedOfficerRoute, ProtectedAdminRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Citizen Routes (NO LOGIN REQUIRED) */}
        <Route path="/" element={<CitizenCallPage />} />
        <Route path="/track/:ticketId" element={<CitizenTrackPage />} />

        {/* Authentication Route */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/officer/login" element={<Navigate to="/login" replace />} />

        {/* Protected Officer Route */}
        <Route 
          path="/officer/portal" 
          element={
            <ProtectedOfficerRoute>
              <OfficerPortalPage />
            </ProtectedOfficerRoute>
          } 
        />

        {/* Protected Admin Route */}
        <Route 
          path="/admin" 
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          } 
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}