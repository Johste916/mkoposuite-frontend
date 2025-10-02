// src/utils/loanSchedule.js
import api from '../api';

/* ---------- tiny formatters ---------- */
export const fmtMoney = (n, currency = 'TZS') =>
  `\u200e${currency} ${Number(n || 0).toLocaleString()}`;

export const asDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
export const asDateTime = (d) => (d ? new Date(d).toLocaleString() : '');
export const asISO = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d).slice(0, 10);
  return dt.toISOString().slice(0, 10);
};

/* Normalize schedule payloads from different API shapes */
export function normalizeSchedule(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.schedule)) return payload.schedule;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.data)) return payload.data;
  return null;
}

/* ---------- inferences ---------- */
export function inferFrequency(schedule = []) {
  const dates = schedule
    .map((r) => new Date(r.dueDate || r.date))
    .filter((d) => !Number.isNaN(d.getTime()));
  if (dates.length < 2) return '';
  let monthly = 0;
  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1];
    const curr = dates[i];
    const diffMonths =
      (curr.getFullYear() - prev.getFullYear()) * 12 +
      (curr.getMonth() - prev.getMonth());
    const sameDayish = Math.abs(curr.getDate() - prev.getDate()) <= 2;
    if (diffMonths === 1 && sameDayish) monthly++;
  }
  return monthly >= Math.max(1, dates.length - 2) ? 'Monthly' : '';
}

/* ---------- paid allocator (fallback when backend gives no breakdowns) ---------- */
function allocatePaidAcrossSchedule(schedule = [], totalPaid = 0) {
  let remain = Number(totalPaid || 0);
  let paidP = 0, paidI = 0, paidPN = 0, paidF = 0;

  for (const row of schedule) {
    const fee = Number(row.fee ?? row.fees ?? 0);
    const pen = Number(row.penalty ?? 0);
    const int = Number(row.interest ?? 0);
    const pri = Number(row.principal ?? 0);

    if (remain <= 0) break;
    const f = Math.min(remain, fee); paidF += f; remain -= f;

    if (remain <= 0) break;
    const p = Math.min(remain, pen); paidPN += p; remain -= p;

    if (remain <= 0) break;
    const i = Math.min(remain, int); paidI += i; remain -= i;

    if (remain <= 0) break;
    const pr = Math.min(remain, pri); paidP += pr; remain -= pr;
  }
  return { paidPrincipal: paidP, paidInterest: paidI, paidPenalty: paidPN, paidFees: paidF };
}

/* ---------- compute outstanding for a single row (trust numbers, not flags) ---------- */
export const computeRowOutstanding = (row) => {
  const principal = Number(row?.principal || 0);
  const interest  = Number(row?.interest  || 0);
  const penalty   = Number(row?.penalty   || 0);
  const fees      = Number(row?.fee ?? row?.fees ?? 0);
  const total     = row?.total != null ? Number(row.total) : (principal + interest + penalty + fees);

  // 1) Trust numeric balance if provided
  if (row?.balance != null && !Number.isNaN(Number(row.balance))) return Number(row.balance);

  // 2) If we have any paid breakdowns, compute from them
  const hasPaidBreakdown =
    row?.paidPrincipal != null ||
    row?.paidInterest  != null ||
    row?.paidPenalty   != null ||
    row?.paidFees      != null ||
    row?.paidFee       != null;

  if (hasPaidBreakdown) {
    const paidP  = Number(row.paidPrincipal || 0);
    const paidI  = Number(row.paidInterest  || 0);
    const paidPN = Number(row.paidPenalty   || 0);
    const paidF  = Number(row.paidFees || 0) + Number(row.paidFee || 0);
    return Math.max(total - (paidP + paidI + paidPN + paidF), 0);
  }

  // 3) No reliable numbers → show total; don't zero out based on flags
  return total;
};

/* ---------- shared column names + row mapper for the table ---------- */
export const SCHEDULE_COLUMNS = [
  '#',
  'Due Date',
  'Principal',
  'Interest',
  'Total P&I',
  'Penalty',
  'Fees',
  'Paid Principal',
  'Paid Interest',
  'Outstanding',
  'Status',
];

/** Map raw schedule rows into a consistent shape for the table */
export function mapScheduleRows(schedule = []) {
  const rows = [];
  const eps = 1e-6;

  for (let i = 0; i < schedule.length; i++) {
    const r = schedule[i];
    const principal = Number(r.principal || 0);
    const interest  = Number(r.interest || 0);
    const penalty   = Number(r.penalty  || 0);
    const fees      = Number(r.fee ?? r.fees ?? 0);

    const paidP = r.paidPrincipal != null ? Number(r.paidPrincipal) : null;
    const paidI = r.paidInterest  != null ? Number(r.paidInterest)  : null;

    const outstanding = computeRowOutstanding(r);
    const status = outstanding <= eps ? 'Settled' : 'Pending';

    rows.push({
      idx: r.installment ?? r.period ?? (i + 1),
      dueDateISO: asISO(r.dueDate ?? r.date ?? ''),
      principal,
      interest,
      penalty,
      fees,
      pi: principal + interest,
      paidP,
      paidI,
      outstanding,
      status,
    });
  }
  return rows;
}

/* ---------- totals / aggregates used by both pages/modals ---------- */
export function computeScheduleTotals(schedule = [], repayments = []) {
  const arr = Array.isArray(schedule) ? schedule : [];
  const sum = (k) => arr.reduce((a, b) => a + Number(b?.[k] || 0), 0);

  const scheduledPrincipal = sum('principal');
  const scheduledInterest  = sum('interest');
  const scheduledPenalty   = sum('penalty');
  const scheduledFees      = sum('fee') + sum('fees');
  const scheduledTotal     = sum('total') || (scheduledPrincipal + scheduledInterest + scheduledPenalty + scheduledFees);

  const totalPaid = (Array.isArray(repayments) ? repayments : []).reduce((a, r) => a + Number(r.amount || 0), 0);

  // Prefer server-provided breakdown totals if present:
  const paidPrincipalExplicit = sum('paidPrincipal') || 0;
  const paidInterestExplicit  = sum('paidInterest')  || 0;
  const paidPenaltyExplicit   = sum('paidPenalty')   || 0;
  const paidFeesExplicit      = (sum('paidFees') + sum('paidFee')) || 0;
  const explicitSum = paidPrincipalExplicit + paidInterestExplicit + paidPenaltyExplicit + paidFeesExplicit;

  const breakdown = explicitSum > 0
    ? {
        paidPrincipal: paidPrincipalExplicit,
        paidInterest:  paidInterestExplicit,
        paidPenalty:   paidPenaltyExplicit,
        paidFees:      paidFeesExplicit,
      }
    : allocatePaidAcrossSchedule(arr, totalPaid);

  const outstanding = Math.max(scheduledTotal - totalPaid, 0);

  // Next due: first row whose computed outstanding is positive
  const next = arr.find((r) => computeRowOutstanding(r) > 0) || null;

  const nextDue = next
    ? {
        idx: next.installment ?? next.period ?? (arr.indexOf(next) + 1),
        date: next.dueDate || next.date || null,
        amount: Number(next.total ?? 0),
      }
    : null;

  return {
    scheduledPrincipal, scheduledInterest, scheduledPenalty, scheduledFees,
    scheduledTotal, totalPaid, outstanding, outstandingTotal: outstanding, // both keys
    nextDue,
    ...breakdown,
  };
}

/* ---------- optional company details (used in PDF/CSV headers) ---------- */
export async function fetchCompany() {
  let company = { name: 'MkopoSuite', address: '', phone: '', email: '', website: '', logoUrl: '' };
  try {
    const r = await api.get('/settings');
    const s = r.data || {};
    company = {
      name: s.companyName || s.name || company.name,
      address: s.companyAddress || s.address || company.address,
      phone: s.companyPhone || s.phone || company.phone,
      email: s.companyEmail || s.email || company.email,
      website: s.companyWebsite || s.website || company.website,
      logoUrl: s.logoUrl || s.companyLogoUrl || company.logoUrl,
    };
    return company;
  } catch {}
  try {
    const r = await api.get('/account');
    const s = r.data?.settings || {};
    company = {
      name: s.companyName || s.name || company.name,
      address: s.companyAddress || s.address || company.address,
      phone: s.companyPhone || s.phone || company.phone,
      email: s.companyEmail || s.email || company.email,
      website: s.companyWebsite || s.website || company.website,
      logoUrl: s.logoUrl || s.companyLogoUrl || company.logoUrl,
    };
    return company;
  } catch {}
  try {
    const r = await api.get('/settings/sidebar');
    const app = r.data?.app || {};
    company.name = app.name || company.name;
    company.logoUrl = app.logoUrl || company.logoUrl;
  } catch {}
  return company;
}

/* ---------- exports: CSV / PDF ---------- */
export function downloadScheduleCSV({ loan, schedule = [], currency = 'TZS', method = '', company = {} }) {
  if (!schedule.length) return;
  const meta = [
    ['Company', company.name || ''],
    ['Address', company.address || ''],
    ['Phone', company.phone || ''],
    ['Email', company.email || ''],
    ['Website', company.website || ''],
    [],
    ['Loan ID', loan?.id ?? ''],
    ['Borrower', loan?.Borrower?.name || loan?.borrowerName || ''],
    ['Status', loan?.status || ''],
    ['Currency', currency],
    ['Interest Method', method || loan?.interestMethod || ''],
    ['Disbursed', asISO(loan?.releaseDate || loan?.startDate || '')],
    ['Generated At', new Date().toLocaleString()],
    [],
  ];

  const headers = SCHEDULE_COLUMNS.slice(0, -1).concat('Settled');
  const rows = mapScheduleRows(schedule).map((r) => [
    r.idx,
    r.dueDateISO,
    r.principal,
    r.interest,
    r.pi,
    r.penalty,
    r.fees,
    r.paidP ?? '',
    r.paidI ?? '',
    r.outstanding,
    r.outstanding <= 1e-6 ? 'YES' : 'NO',
  ]);

  const totals = computeScheduleTotals(schedule, []);
  const footer = [
    [],
    ['Totals', '', totals.scheduledPrincipal, totals.scheduledInterest,
      totals.scheduledPrincipal + totals.scheduledInterest,
      totals.scheduledPenalty, totals.scheduledFees,
      totals.paidPrincipal, totals.paidInterest, totals.outstanding, ''],
    ['Total Paid', '', '', '', '', '', '', '', '', totals.totalPaid, ''],
  ];

  const all = [...meta, headers, ...rows, ...footer];
  const csv = all.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `loan_${loan?.id ?? 'schedule'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadSchedulePDF({ loan, schedule = [], currency = 'TZS', method = '', company = {} }) {
  if (!schedule.length) return;

  let jsPDF, autoTable;
  try {
    jsPDF = (await import('jspdf')).default;
    autoTable = (await import('jspdf-autotable')).default;
  } catch {
    return printFallback({ loan, schedule, currency, method, company });
  }

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftX = 40;
  let y = 40;

  if (company.logoUrl) {
    try {
      const img = await fetch(company.logoUrl).then((r) => r.blob());
      const reader = new FileReader();
      const p = new Promise((resolve) => { reader.onload = () => resolve(reader.result); });
      reader.readAsDataURL(img);
      const dataUrl = await p;
      doc.addImage(dataUrl, 'PNG', leftX, y, 120, 40);
    } catch {}
  }

  doc.setFontSize(14);
  doc.text(company.name || 'Company', leftX, y + 65);
  doc.setFontSize(10);
  [company.address,
   [company.phone, company.email].filter(Boolean).join('  •  '),
   company.website].filter(Boolean)
   .forEach((line, i) => doc.text(String(line), leftX, y + 80 + i * 14));

  doc.setFontSize(16);
  doc.text('Loan Repayment Schedule', pageWidth - 40, 50, { align: 'right' });
  doc.setFontSize(10);
  const meta = [
    `Loan ID: ${loan?.id ?? ''}`,
    `Borrower: ${loan?.Borrower?.name || loan?.borrowerName || ''}`,
    `Status: ${loan?.status || ''}`,
    `Currency: ${currency}`,
    `Interest Method: ${method || loan?.interestMethod || ''}`,
    `Disbursed: ${asISO(loan?.releaseDate || loan?.startDate || '')}`,
    `Generated: ${new Date().toLocaleString()}`,
  ];
  meta.forEach((m, i) => doc.text(m, pageWidth - 40, 68 + i * 14, { align: 'right' }));

  const columns = [
    { header: '#', dataKey: 'idx' },
    { header: 'Due Date', dataKey: 'dueDate' },
    { header: 'Principal', dataKey: 'principal' },
    { header: 'Interest', dataKey: 'interest' },
    { header: 'Total P&I', dataKey: 'pi' },
    { header: 'Penalty', dataKey: 'penalty' },
    { header: 'Fees', dataKey: 'fees' },
    { header: 'Paid Principal', dataKey: 'paidP' },
    { header: 'Paid Interest', dataKey: 'paidI' },
    { header: 'Outstanding', dataKey: 'outstanding' },
    { header: 'Settled', dataKey: 'settled' },
  ];

  const eps = 1e-6;
  const rows = mapScheduleRows(schedule).map((r) => ({
    idx: r.idx,
    dueDate: r.dueDateISO,
    principal: fmtMoney(r.principal, currency),
    interest: fmtMoney(r.interest, currency),
    pi: fmtMoney(r.pi, currency),
    penalty: fmtMoney(r.penalty, currency),
    fees: fmtMoney(r.fees, currency),
    paidP: r.paidP == null ? '—' : fmtMoney(r.paidP, currency),
    paidI: r.paidI == null ? '—' : fmtMoney(r.paidI, currency),
    outstanding: fmtMoney(r.outstanding, currency),
    settled: r.outstanding <= eps ? 'YES' : 'NO',
  }));

  autoTable(doc, {
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => r[c.dataKey])),
    startY: 140,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [243, 244, 246], textColor: 20 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 40, right: 40 },
    didDrawPage: () => {
      const str = `Page ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(9);
      doc.text(str, pageWidth - 40, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
    },
  });

  // Summary
  const totals = computeScheduleTotals(schedule, []);
  let endY = doc.lastAutoTable?.finalY || 140;
  endY += 16;
  doc.setFontSize(11);
  doc.text('Summary', 40, endY);
  endY += 8;
  doc.setFontSize(10);
  const sumLines = [
    ['Principal (Sched.)', fmtMoney(totals.scheduledPrincipal, currency)],
    ['Interest (Sched.)', fmtMoney(totals.scheduledInterest, currency)],
    ['Total P&I (Sched.)', fmtMoney(totals.scheduledPrincipal + totals.scheduledInterest, currency)],
    ['Penalty (Sched.)', fmtMoney(totals.scheduledPenalty, currency)],
    ['Fees (Sched.)', fmtMoney(totals.scheduledFees, currency)],
    ['Total Payable', fmtMoney(totals.scheduledTotal, currency)],
    ['Paid Principal', fmtMoney(totals.paidPrincipal, currency)],
    ['Paid Interest', fmtMoney(totals.paidInterest, currency)],
    ['Total Paid', fmtMoney(totals.totalPaid, currency)],
    ['Outstanding', fmtMoney(totals.outstanding, currency)],
  ];
  sumLines.forEach((row, i) => {
    doc.text(row[0], 40, endY + 16 + i * 14);
    doc.text(row[1], pageWidth - 40, endY + 16 + i * 14, { align: 'right' });
  });

  doc.save(`loan_${loan?.id ?? 'schedule'}.pdf`);
}

/* ---------- print fallback ---------- */
function printFallback({ loan, schedule = [], currency, method, company }) {
  const rowsHtml = mapScheduleRows(schedule)
    .map(
      (r) => `
      <tr>
        <td>${r.idx}</td>
        <td>${r.dueDateISO}</td>
        <td>${fmtMoney(r.principal, currency)}</td>
        <td>${fmtMoney(r.interest, currency)}</td>
        <td>${fmtMoney(r.pi, currency)}</td>
        <td>${fmtMoney(r.penalty, currency)}</td>
        <td>${fmtMoney(r.fees, currency)}</td>
        <td>${r.paidP == null ? '—' : fmtMoney(r.paidP, currency)}</td>
        <td>${r.paidI == null ? '—' : fmtMoney(r.paidI, currency)}</td>
        <td>${fmtMoney(r.outstanding, currency)}</td>
        <td>${r.outstanding <= 1e-6 ? 'YES' : 'NO'}</td>
      </tr>`
    )
    .join('');

  const logoHtml = company?.logoUrl
    ? `<img src="${company.logoUrl}" style="height:48px;object-fit:contain;margin-right:12px;" />`
    : '';

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Loan ${loan?.id ?? ''} Schedule</title>
        <style>
          body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Noto Sans', 'Helvetica Neue', Arial; color:#111827; }
          .container { max-width: 1024px; margin: 24px auto; }
          .header { display:flex; align-items:center; justify-content:space-between; }
          .company { display:flex; align-items:center; }
          .company h1 { margin:0; font-size:18px; }
          .muted { color:#6B7280; font-size:12px; }
          table { width:100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #E5E7EB; padding: 6px 8px; font-size: 12px; }
          thead { background:#F3F4F6; }
          .summary { margin-top:16px; display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:8px; }
          .card { border:1px solid #E5E7EB; padding:8px 10px; border-radius:8px; }
          @media print { .no-print { display:none; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="company">
              ${logoHtml}
              <div>
                <h1>${company?.name || ''}</h1>
                <div class="muted">
                  ${[company?.address, company?.phone, company?.email, company?.website].filter(Boolean).join(' • ')}
                </div>
              </div>
            </div>
            <div>
              <div style="font-weight:600;">Loan Repayment Schedule</div>
              <div class="muted">Generated: ${new Date().toLocaleString()}</div>
            </div>
          </div>

          <div style="margin-top:12px;font-size:12px;">
            <div><b>Loan ID:</b> ${loan?.id ?? ''}</div>
            <div><b>Borrower:</b> ${loan?.Borrower?.name || loan?.borrowerName || ''}</div>
            <div><b>Status:</b> ${loan?.status || ''}</div>
            <div><b>Currency:</b> ${loan?.currency || currency} &nbsp; • &nbsp; <b>Interest Method:</b> ${method || loan?.interestMethod || ''}</div>
            <div><b>Disbursed:</b> ${asISO(loan?.releaseDate || loan?.startDate || '')}</div>
          </div>

          <table>
            <thead>
              <tr>${SCHEDULE_COLUMNS.map((c) => `<th>${c}</th>`).join('')}<th>Settled</th></tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <div class="no-print" style="margin-top:16px;">
            <button onclick="window.print()" style="padding:8px 12px;border:1px solid #E5E7EB;border-radius:8px;background:white;cursor:pointer;">Print / Save as PDF</button>
          </div>
        </div>
      </body>
    </html>
  `;
  const w = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=768');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* ---------- row builders for exports ---------- */
export const rowsForPDF = (schedule = [], currency = 'TZS') =>
  (Array.isArray(schedule) ? schedule : []).map((r, i) => {
    const principal = Number(r.principal || 0);
    const interest  = Number(r.interest  || 0);
    const penalty   = Number(r.penalty   || 0);
    const fees      = Number(r.fee ?? r.fees ?? 0);
    const pi        = principal + interest;
    const outstanding = computeRowOutstanding(r);
    const eps = 1e-6;

    return {
      idx: r.installment ?? r.period ?? i + 1,
      dueDate: asISO(r.dueDate ?? r.date ?? ''),
      principal: fmtMoney(principal, currency),
      interest: fmtMoney(interest, currency),
      pi: fmtMoney(pi, currency),
      penalty: fmtMoney(penalty, currency),
      fees: fmtMoney(fees, currency),
      paidP: r.paidPrincipal != null ? fmtMoney(Number(r.paidPrincipal), currency) : '—',
      paidI: r.paidInterest  != null ? fmtMoney(Number(r.paidInterest),  currency) : '—',
      outstanding: fmtMoney(outstanding, currency),
      settled: outstanding <= eps ? 'YES' : 'NO',
    };
  });

export const rowsForExcel = (schedule = []) =>
  (Array.isArray(schedule) ? schedule : []).map((r, i) => {
    const principal = Number(r.principal || 0);
    const interest  = Number(r.interest  || 0);
    const penalty   = Number(r.penalty   || 0);
    const fees      = Number(r.fee ?? r.fees ?? 0);
    const pi        = principal + interest;
    const outstanding = computeRowOutstanding(r);
    const eps = 1e-6;

    return {
      idx: r.installment ?? r.period ?? i + 1,
      dueDate: asISO(r.dueDate ?? r.date ?? ''),
      principal,
      interest,
      pi,
      penalty,
      fees,
      paidP: r.paidPrincipal != null ? Number(r.paidPrincipal) : '',
      paidI: r.paidInterest  != null ? Number(r.paidInterest)  : '',
      outstanding,
      settled: outstanding <= eps ? 'YES' : 'NO',
    };
  });
