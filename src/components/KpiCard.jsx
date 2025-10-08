import React from "react";

/** A reusable KPI card with tone props; matches your Dashboard style */
export default function KpiCard({ title, value, icon, tone = "indigo" }) {
  const tones =
    {
      indigo:  { ring: "ring-indigo-100 dark:ring-indigo-900/40",  icon: "text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/40" },
      sky:     { ring: "ring-sky-100 dark:ring-sky-900/40",        icon: "text-sky-600 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/40" },
      blue:    { ring: "ring-blue-100 dark:ring-blue-900/40",      icon: "text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/40" },
      emerald: { ring: "ring-emerald-100 dark:ring-emerald-900/40",icon: "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40" },
      cyan:    { ring: "ring-cyan-100 dark:ring-cyan-900/40",      icon: "text-cyan-600 bg-cyan-50 dark:text-cyan-300 dark:bg-cyan-950/40" },
      amber:   { ring: "ring-amber-100 dark:ring-amber-900/40",    icon: "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40" },
      violet:  { ring: "ring-violet-100 dark:ring-violet-900/40",  icon: "text-violet-600 bg-violet-50 dark:text-violet-300 dark:bg-violet-950/40" },
      rose:    { ring: "ring-rose-100 dark:ring-rose-900/40",      icon: "text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/40" },
      slate:   { ring: "ring-slate-100 dark:ring-slate-800",       icon: "text-slate-600 bg-slate-50 dark:text-slate-300 dark:bg-slate-950/40" },
    }[tone] || { ring: "ring-slate-100 dark:ring-slate-800", icon: "text-slate-600 bg-slate-50 dark:text-slate-300 dark:bg-slate-950/40" };

  return (
    <div className={`rounded-2xl shadow-sm border border-[var(--border)] bg-[var(--card)] p-4 ring-1 ${tones.ring} min-h-[7rem]`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${tones.icon}`}>{icon}</div>
        <div>
          <h3 className="text-xs font-medium text-[var(--muted)]">{title}</h3>
          <p className="text-xl font-semibold text-[var(--fg)]">{value ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}
