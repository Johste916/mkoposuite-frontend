/*  ----------  src/pages/admin/tenants/TenantsRouter.jsx  ---------- */
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const TenantsList = lazy(() => import("./TenantsList"));
const TenantDetails = lazy(() => import("./TenantDetails"));
const TenantEdit = lazy(() => import("./TenantEdit"));
const TenantBilling = lazy(() => import("./TenantBilling"));

const Fallback = () => (
  <div className="p-6 text-sm text-slate-700 dark:text-slate-300">Loading…</div>
);

export default function TenantsRouter() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route index element={<TenantsList />} />
        <Route path=":tenantId" element={<TenantDetails />} />
        <Route path=":tenantId/edit" element={<TenantEdit />} />
        <Route path=":tenantId/billing" element={<TenantBilling />} />
        {/* alias to edit */}
        <Route path=":tenantId/organization" element={<TenantEdit />} />
        <Route path="*" element={<Navigate to=".." replace />} />
      </Routes>
    </Suspense>
  );
}
