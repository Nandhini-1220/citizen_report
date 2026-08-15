import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export function ProtectedOfficerRoute({ children }) {
  const role = localStorage.getItem('auth_role');
  const location = useLocation();

  if (!role || (role !== 'officer' && role !== 'admin')) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export function ProtectedAdminRoute({ children }) {
  const role = localStorage.getItem('auth_role');
  const location = useLocation();

  if (!role || role !== 'admin') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}