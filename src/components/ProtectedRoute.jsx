import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { loading, token } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
