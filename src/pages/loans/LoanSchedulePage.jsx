import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api';

/* ---------------- helpers ---------------- */
const fmtMoney = (n, currency = 'TZS') =>
  `\u200e${currency} ${Number(n || 0).toLocaleString()}`;
const asDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
const asISO = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

/** Try multiple endpoints to get company/org details */
async function fetchCompanyDetails() {
  // Defaults if API doesn’t provide anything
  let company = {
    name: 'MkopoSuite',
    address: '',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
  };

  // Try /api/settings (common)
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

  // Try /api/account (fallback per your backend)
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

  // As a last resort, try a public sidebar (some backends expose pieces here)
  try {
    const r = await api.get('/settings/sidebar');
    const app = r.data?.app || {};
    company.name = app.name || company.name;
    company.logoUrl = app.logoUrl || company.logoUrl;
  } catch {}

  return company;
}

export default function LoanSchedulePage() {
  const [loanId, setLoanId] = useState('');
  const [loan, setLoan] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [method, setMethod] = useState('');
  const [currency, setCurrency] = useState('TZS');
  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);
  const [company, setCompany] = useState({
    name: 'MkopoSuite',
    address: '',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
  });

  const pollRef = useRef(null);

  useEffect(() => {
    // Load company info once
    fetchCompanyDetails().then(setCompany).catch(() => {});
  }, []);

  /* ---------- core fetch ---------- */
  const fetchAll = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      // schedule
      const sch = await api.get(`/loans/${id}/schedule`);
      const item = sch.data || {};
      const schArr = Array.isArray(item) ? item : (item.schedule || []);
      setSchedule(schArr);
      setMethod(item.interestMethod || item.method || '');
      if (item.currency) setCurrency(item.currency);

      // loan
      const lr = await api.get(`/loans/${id}`);
      setLoan(lr.data || null);
      if (lr.data?.currency) setCurrency(lr.data.currency);

      // repayments (used for totals + status update)
      const rp = await api
        .get(`/repayments/loan/${id}`)
        .then((r) => r.data || [])
        .catch(() => []);
      setRepayments(rp);

      // Update loan to "active" once payments start (if not active/closed already)
      const hasPaid = (rp?.length || 0) > 0;
      const status = (lr.data?.status || '').toLowerCase();
      if (hasPaid && status && !['active', 'closed'].includes(status)) {
        try {
          await api.patch(`/loans/${id}/status`, { status: 'active' });
          const lr2 = await api.get(`/loans/${id}`);
          setLoan(lr2.data || lr.data || null);
        } catch {
          // ignore if forbidden by backend
        }
      }
    } catch (e) {
      setSchedule([]);
      setRepayments([]);
      setLoan(null);
      setMethod('');
    } finally {
      setLoading(false);
    }
  };

  /* ----------- manual load ----------- */
  const onLoad = async (e) => {
    e.preventDefault();
    await fetchAll(loanId.trim());
  };

  /* ----------- auto refresh ----------- */
  useEffect(() => {
    if (!loanId || !auto) return;
    pollRef.current && clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchAll(loanId.trim()), 10000);
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [loanId, auto]);

  /* ----------- computed totals ----------- */
  const totals = useMemo(() => {
    const sum = (arr, k) => arr.reduce((a, b) => a + Number(b?.[k] || 0), 0);
    const principal = sum(schedule, 'principal');
    const interest = sum(schedule, 'interest');
    const penalty = sum(schedule, 'penalty');
    const total = sum(schedule, 'total') || principal + interest + penalty;
    const paid = repayments.reduce((a, b) => a + Number(b.amount || 0), 0);
    const outstanding = Math.max(total - paid, 0);
    return { principal, interest, penalty, total, paid, outstanding };
  }, [schedule, repayments]);

  /* ----------- export CSV ----------- */
  const downloadCSV = () => {
    if (!schedule.length) return;
    // Top meta lines with company + loan details
    const meta = [
      ['Company', company.name],
      ['Address', company.address],
      ['Phone', company.phone],
      ['Email', company.email],
      ['Website', company.website],
      [],
      ['Loan ID', loan?.id ?? loanId],
      ['Borrower', loan?.Borrower?.name || loan?.borrowerName || ''],
      ['Status', loan?.status || ''],
      ['Currency', currency],
      ['Interest Method', method],
      ['Generated At', new Date().toLocaleString()],
      [],
    ];

    const headers = [
      'Installment',
      'Due Date',
      'Principal',
      'Interest',
      'Penalty',
      'Total',
      'Balance',
    ];
    const rows = schedule.map((r, i) => [
      r.installment ?? r.period ?? i + 1,
      asISO(r.dueDate ?? r.date ?? ''),
      Number(r.principal ?? 0),
      Number(r.interest ?? 0),
      Number(r.penalty ?? 0),
      Number(
        r.total ??
          (Number(r.principal || 0) +
            Number(r.interest || 0) +
            Number(r.penalty || 0))
      ),
      r.balance ?? '',
    ]);

    const footer = [
      [],
      ['Totals', '', totals.principal, totals.interest, totals.penalty, totals.total, ''],
      ['Paid', '', '', '', '', totals.paid, ''],
      ['Outstanding', '', '', '', '', totals.outstanding, ''],
    ];

    const all = [
      ...meta,
      headers,
      ...rows,
      ...footer,
    ];

    const csv =
      all
        .map((r) =>
          r
            .map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loan_${loan?.id ?? loanId}_schedule.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ----------- export PDF ----------- */
  const downloadPDF = async () => {
    if (!schedule.length) return;

    let jsPDF, autoTable;
    try {
      jsPDF = (await import('jspdf')).default;
      autoTable = (await import('jspdf-autotable')).default;
    } catch {
      // Fallback to print-to-PDF if libs not available
      return printFallback();
    }

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header: company info
    const leftX = 40;
    let y = 40;

    if (company.logoUrl) {
      // Attempt to draw logo (same-origin or data URL); ignore failures
      try {
        // If your logo URL might be cross-origin, consider proxying or using base64
        // This will silently fail if the image can't be loaded due to CORS.
        const img = await fetch(company.logoUrl).then((r) => r.blob());
        const reader = new FileReader();
        const p = new Promise((resolve) => {
          reader.onload = () => resolve(reader.result);
        });
        reader.readAsDataURL(img);
        const dataUrl = await p;
        doc.addImage(dataUrl, 'PNG', leftX, y, 120, 40);
      } catch {}
    }

    doc.setFontSize(14);
    doc.text(company.name || 'Company', leftX, y + 65);
    doc.setFontSize(10);
    const lines = [
      company.address,
      [company.phone, company.email].filter(Boolean).join('  •  '),
      company.website,
    ].filter(Boolean);
    lines.forEach((line, i) => doc.text(String(line), leftX, y + 80 + i * 14));

    // Title + meta (right aligned)
    doc.setFontSize(16);
    doc.text('Loan Repayment Schedule', pageWidth - 40, 50, { align: 'right' });
    doc.setFontSize(10);
    const meta = [
      `Loan ID: ${loan?.id ?? loanId}`,
      `Borrower: ${loan?.Borrower?.name || loan?.borrowerName || ''}`,
      `Status: ${loan?.status || ''}`,
      `Currency: ${currency}`,
      `Interest Method: ${method || ''}`,
      `Generated: ${new Date().toLocaleString()}`,
    ];
    meta.forEach((m, i) =>
      doc.text(m, pageWidth - 40, 68 + i * 14, { align: 'right' })
    );

    // Table
    const columns = [
      { header: '#', dataKey: 'idx' },
      { header: 'Due Date', dataKey: 'dueDate' },
      { header: 'Principal', dataKey: 'principal' },
      { header: 'Interest', dataKey: 'interest' },
      { header: 'Penalty', dataKey: 'penalty' },
      { header: 'Total', dataKey: 'total' },
      { header: 'Balance', dataKey: 'balance' },
    ];
    const rows = schedule.map((r, i) => ({
      idx: r.installment ?? r.period ?? i + 1,
      dueDate: asISO(r.dueDate ?? r.date ?? ''),
      principal: fmtMoney(r.principal, currency),
      interest: fmtMoney(r.interest, currency),
      penalty: fmtMoney(r.penalty || 0, currency),
      total: fmtMoney(
        r.total ??
          (Number(r.principal || 0) +
            Number(r.interest || 0) +
            Number(r.penalty || 0)),
        currency
      ),
      balance:
        r.balance != null ? fmtMoney(r.balance, currency) : '—',
    }));

    autoTable(doc, {
      head: [columns.map((c) => c.header)],
      body: rows.map((r) => columns.map((c) => r[c.dataKey])),
      startY: 140,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [243, 244, 246], textColor: 20 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 40, right: 40 },
      didDrawPage: (data) => {
        // Footer page number
        const str = `Page ${doc.internal.getNumberOfPages()}`;
        doc.setFontSize(9);
        doc.text(str, pageWidth - 40, doc.internal.pageSize.getHeight() - 20, {
          align: 'right',
        });
      },
    });

    // Totals box
    let endY = doc.lastAutoTable?.finalY || 140;
    endY += 16;
    doc.setFontSize(11);
    doc.text('Summary', 40, endY);
    endY += 8;
    doc.setFontSize(10);
    const sumLines = [
      ['Principal', fmtMoney(totals.principal, currency)],
      ['Interest', fmtMoney(totals.interest, currency)],
      ['Penalty', fmtMoney(totals.penalty, currency)],
      ['Total Payable', fmtMoney(totals.total, currency)],
      ['Total Paid', fmtMoney(totals.paid, currency)],
      ['Outstanding', fmtMoney(totals.outstanding, currency)],
    ];
    sumLines.forEach((row, i) => {
      doc.text(row[0], 40, endY + 16 + i * 14);
      doc.text(row[1], pageWidth - 40, endY + 16 + i * 14, { align: 'right' });
    });

    doc.save(`loan_${loan?.id ?? loanId}_schedule.pdf`);
  };

  /* ----------- print (fallback to save as PDF) ----------- */
  const printFallback = () => {
    const rowsHtml = schedule
      .map((r, i) => {
        const total =
          r.total ??
          (Number(r.principal || 0) +
            Number(r.interest || 0) +
            Number(r.penalty || 0));
        return `
          <tr>
            <td>${r.installment ?? r.period ?? i + 1}</td>
            <td>${asISO(r.dueDate ?? r.date ?? '')}</td>
            <td>${fmtMoney(r.principal, currency)}</td>
            <td>${fmtMoney(r.interest, currency)}</td>
            <td>${fmtMoney(r.penalty || 0, currency)}</td>
            <td>${fmtMoney(total, currency)}</td>
            <td>${r.balance != null ? fmtMoney(r.balance, currency) : '—'}</td>
          </tr>
        `;
      })
      .join('');

    const logoHtml = company.logoUrl
      ? `<img src="${company.logoUrl}" style="height:48px;object-fit:contain;margin-right:12px;" />`
      : '';

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Loan ${loan?.id ?? loanId} Schedule</title>
          <style>
            body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Noto Sans', 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; color:#111827; }
            .container { max-width: 960px; margin: 24px auto; }
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
                  <h1>${company.name || ''}</h1>
                  <div class="muted">
                    ${[company.address, company.phone, company.email, company.website]
                      .filter(Boolean)
                      .join(' • ')}
                  </div>
                </div>
              </div>
              <div>
                <div style="font-weight:600;">Loan Repayment Schedule</div>
                <div class="muted">Generated: ${new Date().toLocaleString()}</div>
              </div>
            </div>

            <div style="margin-top:12px;font-size:12px;">
              <div><b>Loan ID:</b> ${loan?.id ?? loanId}</div>
              <div><b>Borrower:</b> ${loan?.Borrower?.name || loan?.borrowerName || ''}</div>
              <div><b>Status:</b> ${loan?.status || ''}</div>
              <div><b>Currency:</b> ${currency} &nbsp; • &nbsp; <b>Interest Method:</b> ${method || ''}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Due Date</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Penalty</th>
                  <th>Total</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="summary">
              <div class="card"><div class="muted">Principal</div><div><b>${fmtMoney(
                totals.principal,
                currency
              )}</b></div></div>
              <div class="card"><div class="muted">Interest</div><div><b>${fmtMoney(
                totals.interest,
                currency
              )}</b></div></div>
              <div class="card"><div class="muted">Penalty</div><div><b>${fmtMoney(
                totals.penalty,
                currency
              )}</b></div></div>
              <div class="card"><div class="muted">Total Payable</div><div><b>${fmtMoney(
                totals.total,
                currency
              )}</b></div></div>
              <div class="card"><div class="muted">Total Paid</div><div><b>${fmtMoney(
                totals.paid,
                currency
              )}</b></div></div>
              <div class="card"><div class="muted">Outstanding</div><div><b>${fmtMoney(
                totals.outstanding,
                currency
              )}</b></div></div>
            </div>

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
  };

  return (
    <div className="p-4 space-y-4">
      {/* header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Loan Schedule</h2>
          {loan && (
            <p className="text-sm text-gray-600">
              Loan&nbsp;<b>#{loan.id}</b> — Status:&nbsp;
              <span className="inline-block rounded-full px-2 py-0.5 text-xs bg-slate-100 border">
                {loan.status}
              </span>
            </p>
          )}
          {/* Company line for quick context */}
          <p className="text-xs text-gray-500 mt-1">
            {company.name}
            {company.address ? ` • ${company.address}` : ''}
            {company.phone ? ` • ${company.phone}` : ''}
            {company.email ? ` • ${company.email}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loanId && fetchAll(loanId.trim())}
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Refresh
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={auto}
              onChange={(e) => setAuto(e.target.checked)}
            />
            Auto-refresh
          </label>
          <button
            onClick={downloadCSV}
            disabled={!schedule.length}
            className="px-3 py-2 rounded border hover:bg-gray-50 disabled:opacity-50"
            title="Download as CSV"
          >
            Download CSV
          </button>
          <button
            onClick={downloadPDF}
            disabled={!schedule.length}
            className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
            title="Download as PDF"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* load form */}
      <form onSubmit={onLoad} className="flex gap-2 flex-wrap">
        <input
          className="border px-3 py-2 rounded w-64"
          placeholder="Enter Loan ID"
          value={loanId}
          onChange={(e) => setLoanId(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          {loading ? 'Loading…' : 'Load'}
        </button>
        {method && (
          <div className="self-center text-sm text-gray-700">
            Interest Method:&nbsp;<b>{method}</b>
          </div>
        )}
      </form>

      {/* summary */}
      {!!schedule.length && (
        <div className="bg-white rounded border shadow p-3">
          <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            <div>
              <div className="text-gray-500 text-xs">Principal</div>
              <div className="font-semibold">{fmtMoney(totals.principal, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Interest</div>
              <div className="font-semibold">{fmtMoney(totals.interest, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Penalty</div>
              <div className="font-semibold">{fmtMoney(totals.penalty, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Total Payable</div>
              <div className="font-semibold">{fmtMoney(totals.total, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Total Paid</div>
              <div className="font-semibold">{fmtMoney(totals.paid, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Outstanding</div>
              <div className="font-semibold">{fmtMoney(totals.outstanding, currency)}</div>
            </div>
          </div>
        </div>
      )}

      {/* schedule table */}
      {!!schedule.length && (
        <div className="overflow-auto rounded border shadow">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr className="text-left text-sm">
                <th className="p-2 border">#</th>
                <th className="p-2 border">Due Date</th>
                <th className="p-2 border">Principal</th>
                <th className="p-2 border">Interest</th>
                <th className="p-2 border">Penalty</th>
                <th className="p-2 border">Total</th>
                <th className="p-2 border">Balance</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {schedule.map((r, i) => {
                const idx = r.installment ?? r.period ?? i + 1;
                const total =
                  r.total ??
                  (Number(r.principal || 0) +
                    Number(r.interest || 0) +
                    Number(r.penalty || 0));
                return (
                  <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}>
                    <td className="border px-2 py-1">{idx}</td>
                    <td className="border px-2 py-1">{asDate(r.dueDate || r.date)}</td>
                    <td className="border px-2 py-1">{fmtMoney(r.principal, currency)}</td>
                    <td className="border px-2 py-1">{fmtMoney(r.interest, currency)}</td>
                    <td className="border px-2 py-1">{fmtMoney(r.penalty || 0, currency)}</td>
                    <td className="border px-2 py-1">{fmtMoney(total, currency)}</td>
                    <td className="border px-2 py-1">
                      {r.balance != null ? fmtMoney(r.balance, currency) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && loanId && !schedule.length && (
        <p className="text-sm text-gray-600">No schedule found for this loan.</p>
      )}
    </div>
  );
}
