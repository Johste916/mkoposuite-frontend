import React from "react";
import { Link } from "react-router-dom";

export default function LoanProducts() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Loan Products</h1>
        <Link
          to="/loans/products/new"
          className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
        >
          Add Product
        </Link>
      </div>

      {/* Replace this placeholder with your real table/list */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Your loan products list will appear here.
        </p>
      </div>
    </div>
  );
}
