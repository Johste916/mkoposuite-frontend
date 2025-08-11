// src/components/RoleProtectedRoute.jsx
import React from "react";
import NoAccess from "./NoAccess"; // Create this file if it doesn't exist

/**
 * RoleProtectedRoute
 * @param {ReactNode} children - The protected page component
 * @param {Array<string>} allow - List of roles allowed to access
 */
const RoleProtectedRoute = ({ children, allow = ["admin"] }) => {
  // Allow bypass for testing
  const bypass = localStorage.getItem("ALLOW_ALL_GUARDS") === "true";
  if (bypass) return children;

  // Get logged-in user from storage
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const role = String(user?.role || "").toLowerCase();
  const allowed = allow.map((r) => r.toLowerCase());

  // Not logged in or missing role
  if (!role) {
    return <NoAccess reason="You are not logged in or role is missing." />;
  }

  // Role not in allowed list
  if (!allowed.includes(role)) {
    return <NoAccess reason={`Your role "${role}" does not have access.`} />;
  }

  return children;
};

export default RoleProtectedRoute;
