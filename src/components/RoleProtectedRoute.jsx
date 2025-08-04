// src/components/RoleProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAdmin } from '../utils/roleUtils';

const RoleProtectedRoute = ({ children }) => {
  if (!isAdmin()) {
    return <Navigate to="/" />;
  }
  return children;
};

export default RoleProtectedRoute;
