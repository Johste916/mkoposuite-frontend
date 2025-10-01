import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api';

/* ---------------- helpers ---------------- */
const fmtMoney = (n, currency = 'TZS') =>
  `\u200e${currency} ${Number(n || 0).toLocaleString()}`;
const asDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
const asISO = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

/** Soft-allocate a total paid amount across schedule rows (penalty → interest → principal).
 *  This is a safe fallback when backend doesn’t return explicit paid breakdowns.
 */
function allocatePaidAcrossSchedule(schedule = [], totalPaid = 0) {
  let remain = Number(totalPaid || 0);
  let paidP = 0, paidI = 0, paidPN = 0, paidF = 0;

  for (const row of schedule) {
    const fee = Number(row.fee ?? row.fees ?? 0);
    const pen = Number(row.penalty ?? 0);
    const int = Number(row.interest ?? 0);
    const pri = Number(row.principal ?? 0);

    if (remain <= 0) break;
    const f = Math.min(remain, fee);
    paidF += f; remain -= f;

    if (remain <= 0) break;
    const p = Math.min(remain, pen);
    paidPN += p; remain -= p;

    if (remain <= 0) break;
    const i = Math.min(remain, int);
    paidI += i; remain -= i;

    if (remain <= 0) break;
    const pr = Math.min(remain, pri);
    paidP += pr; remain -= pr;
  }
  return { paidPrincipal: paidP, paidInterest: paidI, paidPenalty: paidPN, paidFees: paidF };
}

/** Try multiple endpoints to get company/org details */
async function fetchCompanyDetails() {
  let company = {
    name: 'MkopoSuite',
    address: '',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
  };
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

/* Detect if due dates are monthly-ish (+/- a day) */
function inferFrequency(schedule = []) {
  const dates = schedule
    .map(r => new Date(r.dueDate || r.date))
    .filter(d => !Number.isNaN(d.getTime()));
  if (dates.length < 2) return '';
  let monthly = 0;
  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i-1], curr = dates[i];
    const diffMonths = (curr.getFullYear() - prev.getFullYear()) * 12 + (curr.getMonth() - prev.getMonth());
    const sameDayish = Math.abs(curr.getDate() - prev.getDate()) <= 2;
    if (diffMonths === 1 && sameDayish) monthly++;
  }
  return monthly >= Math.max(1, dates.length - 2) ? 'Monthly' : '';
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

      const hasPaid = (rp?.length || 0) > 0;
      const status = (lr.data?.status || '').toLowerCase();
      if (hasPaid && status && !['active', 'closed'].includes(status)) {
        try {
          await api.patch(`/loans/${id}/status`, { status: 'active' });
          const lr2 = await api.get(`/loans/${id}`);
          setLoan(lr2.data || lr.data || null);
        } catch {}
      }

      window.dispatchEvent(new CustomEvent('loan:updated', { detail: { id } }));
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

  /* ----------- auto refresh & focus refresh ----------- */
  useEffect(() => {
    const onFocus = () => loanId && fetchAll(loanId.trim());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loanId]);

  useEffect(() => {
    if (!loanId || !auto) return;
    pollRef.current && clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchAll(loanId.trim()), 10000);
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [loanId, auto]);

  /* ----------- computed totals (scheduled vs paid) ----------- */
  const totals = useMemo(() => {
    const sum = (arr, k) => arr.reduce((a, b) => a + Number(b?.[k] || 0), 0);
    const scheduledPrincipal = sum(schedule, 'principal');
    const scheduledInterest  = sum(schedule, 'interest');
    const scheduledPenalty   = sum(schedule, 'penalty');
    const scheduledFees      = sum(schedule, 'fee') + sum(schedule, 'fees');

    const scheduledTotal = sum(schedule, 'total') ||
      scheduledPrincipal + scheduledInterest + scheduledPenalty + scheduledFees;

    const totalPaid = repayments.reduce((a, b) => a + Number(b.amount || 0), 0);

    // Prefer explicit paid breakdown fields if provided by backend:
    const paidPrincipalExplicit = sum(schedule, 'paidPrincipal') || 0;
    const paidInterestExplicit  = sum(schedule, 'paidInterest')  || 0;
    const paidPenaltyExplicit   = sum(schedule, 'paidPenalty')   || 0;
    const paidFeesExplicit      = sum(schedule, 'paidFees') + sum(schedule, 'paidFee') || 0;
    const explicitSum =
      paidPrincipalExplicit + paidInterestExplicit + paidPenaltyExplicit + paidFeesExplicit;

    const breakdown = explicitSum > 0
      ? {
          paidPrincipal: paidPrincipalExplicit,
          paidInterest:  paidInterestExplicit,
          paidPenalty:   paidPenaltyExplicit,
          paidFees:      paidFeesExplicit,
        }
      : allocatePaidAcrossSchedule(schedule, totalPaid);

    const outstandingTotal = Math.max(scheduledTotal - totalPaid, 0);

    // Next due: first not fully settled row (if flags available) else row with positive balance
    const next =
      schedule.find(r => (r.paid || r.settled) ? false :
                         (Number(r.balance ?? (Number(r.total||0))) > 0)) || null;

    return {
      scheduledPrincipal, scheduledInterest, scheduledPenalty, scheduledFees,
      scheduledTotal,
      totalPaid,
      ...breakdown,
      outstandingTotal,
      nextDue: next ? {
        idx: next.installment ?? next.period ?? (schedule.indexOf(next) + 1),
        date: next.dueDate || next.date || null,
        amount: Number(next.total ?? 0),
      } : null,
    };
  }, [schedule, repayments]);

  const frequency = useMemo(() => inferFrequency(schedule), [schedule]);

  /* ----------- export CSV ----------- */
  const downloadCSV = () => {
    if (!schedule.length) return;
    const disbursed = loan?.releaseDate || loan?.startDate || '';

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
      ['Disbursed', asISO(disbursed)],
      ['Generated At', new Date().toLocaleString()],
      [],
    ];

    const headers = [
      'Installment',
      'Due Date',
      'Principal',
      'Interest',
      'Total P&I',
      'Penalty',
      'Fees',
      'Paid Principal',
      'Paid Interest',
      'Outstanding',
      'Settled',
    ];
    const rows = schedule.map((r, i) => {
      const pi = Number(r.principal || 0) + Number(r.interest || 0);
      const outstanding = r.balance ?? '';
      return [
        r.installment ?? r.period ?? i + 1,
        asISO(r.dueDate ?? r.date ?? ''),
        Number(r.principal ?? 0),
        Number(r.interest ?? 0),
        Number(pi),
        Number(r.penalty ?? 0),
        Number(r.fee ?? r.fees ?? 0),
        r.paidPrincipal != null ? Number(r.paidPrincipal) : '',
        r.paidInterest  != null ? Number(r.paidInterest)  : '',
        outstanding,
        r.paid || r.settled ? 'YES' : 'NO',
      ];
    });

    const footer = [
      [],
      ['Totals', '', totals.scheduledPrincipal, totals.scheduledInterest,
        totals.scheduledPrincipal + totals.scheduledInterest,
        totals.scheduledPenalty, totals.scheduledFees,
        totals.paidPrincipal, totals.paidInterest, totals.outstandingTotal, ''],
      ['Total Paid', '', '', '', '', '', '', '', '', totals.totalPaid, ''],
    ];

    const all = [...meta, headers, ...rows, ...footer];

    const csv =
      all.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');

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
      return printFallback();
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
      `Disbursed: ${asISO(loan?.releaseDate || loan?.startDate || '')}`,
      `Generated: ${new Date().toLocaleString()}`,
    ];
    meta.forEach((m, i) =>
      doc.text(m, pageWidth - 40, 68 + i * 14, { align: 'right' })
    );

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
    const rows = schedule.map((r, i) => {
      const pi = Number(r.principal || 0) + Number(r.interest || 0);
      return {
        idx: r.installment ?? r.period ?? i + 1,
        dueDate: asISO(r.dueDate ?? r.date ?? ''),
        principal: fmtMoney(r.principal, currency),
        interest: fmtMoney(r.interest, currency),
        pi: fmtMoney(pi, currency),
        penalty: fmtMoney(r.penalty || 0, currency),
        fees: fmtMoney(r.fee ?? r.fees ?? 0, currency),
        paidP: r.paidPrincipal != null ? fmtMoney(r.paidPrincipal, currency) : '—',
        paidI: r.paidInterest  != null ? fmtMoney(r.paidInterest,  currency) : '—',
        outstanding: r.balance != null ? fmtMoney(r.balance, currency) : '—',
        settled: r.paid || r.settled ? 'YES' : 'NO',
      };
    });

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

    // Totals box
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
      ['Outstanding', fmtMoney(totals.outstandingTotal, currency)],
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
        const pi = Number(r.principal || 0) + Number(r.interest || 0);
        return `
          <tr>
            <td>${r.installment ?? r.period ?? i + 1}</td>
            <td>${asISO(r.dueDate ?? r.date ?? '')}</td>
            <td>${fmtMoney(r.principal, currency)}</td>
            <td>${fmtMoney(r.interest, currency)}</td>
            <td>${fmtMoney(pi, currency)}</td>
            <td>${fmtMoney(r.penalty || 0, currency)}</td>
            <td>${fmtMoney(r.fee ?? r.fees ?? 0, currency)}</td>
            <td>${r.paidPrincipal != null ? fmtMoney(r.paidPrincipal, currency) : '—'}</td>
            <td>${r.paidInterest  != null ? fmtMoney(r.paidInterest,  currency) : '—'}</td>
            <td>${r.balance != null ? fmtMoney(r.balance, currency) : '—'}</td>
            <td>${r.paid || r.settled ? 'YES' : 'NO'}</td>
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
            .cal { margin-top:10px; display:flex; flex-wrap: wrap; gap:6px; font-size:12px; }
            .pill { border:1px solid #E5E7EB; border-radius:9999px; padding:3px 8px; background:#fff; }
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
              <div><b>Disbursed:</b> ${asISO(loan?.releaseDate || loan?.startDate || '')}</div>
            </div>

            <div class="cal">
              ${schedule.map((r, i) => `<span class="pill">#${r.installment ?? r.period ?? i+1}: ${asISO(r.dueDate || r.date || '')}</span>`).join('')}
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Due Date</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Total P&I</th>
                  <th>Penalty</th>
                  <th>Fees</th>
                  <th>Paid Principal</th>
                  <th>Paid Interest</th>
                  <th>Outstanding</th>
                  <th>Settled</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="summary">
              <div class="card"><div class="muted">Principal (Sched.)</div><div><b>${fmtMoney(
                totals.scheduledPrincipal, currency
              )}</b></div></div>
              <div class="card"><div class="muted">Interest (Sched.)</div><div><b>${fmtMoney(
                totals.scheduledInterest, currency
              )}</b></div></div>
              <div class="card"><div class="muted">Total P&I (Sched.)</div><div><b>${fmtMoney(
                totals.scheduledPrincipal + totals.scheduledInterest, currency
              )}</b></div></div>
              <div class="card"><div class="muted">Penalty (Sched.)</div><div><b>${fmtMoney(
                totals.scheduledPenalty, currency
              )}</b></div></div>
              <div class="card"><div class="muted">Fees (Sched.)</div><div><b>${fmtMoney(
                totals.scheduledFees, currency
              )}</b></div></div>
              <div class="card"><div class="muted">Total Payable</div><div><b>${fmtMoney(
                totals.scheduledTotal, currency
              )}</b></div></div>
              <div class="card"><div class="muted">Paid Principal</div><div><b>${fmtMoney(
                totals.paidPrincipal, currency
              )}</b></div></div>
              <div class="card"><div class="muted">Paid Interest</div><div><b>${fmtMoney(
                totals.paidInterest, currency
              )}</b></div></div>
              <div class="card"><div class="muted">Total Paid</div><div><b>${fmtMoney(
                totals.totalPaid, currency
              )}</b></div></div>
              <div class="card"><div class="muted">Outstanding</div><div><b>${fmtMoney(
                totals.outstandingTotal, currency
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
          <p className="text-xs text-gray-500 mt-1">
            {company.name}
            {company.address ? ` • ${company.address}` : ''}
            {company.phone ? ` • ${company.phone}` : ''}
            {company.email ? ` • ${company.email}` : ''}
          </p>
          {loan && (
            <p className="text-xs text-gray-700 mt-1">
              <b>Disbursed:</b> {asDate(loan.releaseDate || loan.startDate)}{frequency ? ` • <b>Frequency:</b> ${frequency}` : ''}
            </p>
          )}
          {totals?.nextDue && (
            <p className="text-xs text-gray-700 mt-1">
              Next Installment #{totals.nextDue.idx} on {asDate(totals.nextDue.date)} — <b>{fmtMoney(totals.nextDue.amount, currency)}</b>
            </p>
          )}
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
              <div className="text-gray-500 text-xs">Principal (Sched.)</div>
              <div className="font-semibold">{fmtMoney(totals.scheduledPrincipal, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Interest (Sched.)</div>
              <div className="font-semibold">{fmtMoney(totals.scheduledInterest, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Total P&I (Sched.)</div>
              <div className="font-semibold">{fmtMoney(totals.scheduledPrincipal + totals.scheduledInterest, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Penalty (Sched.)</div>
              <div className="font-semibold">{fmtMoney(totals.scheduledPenalty, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Fees (Sched.)</div>
              <div className="font-semibold">{fmtMoney(totals.scheduledFees, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Total Payable</div>
              <div className="font-semibold">{fmtMoney(totals.scheduledTotal, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Paid Principal</div>
              <div className="font-semibold">{fmtMoney(totals.paidPrincipal, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Paid Interest</div>
              <div className="font-semibold">{fmtMoney(totals.paidInterest, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Total Paid</div>
              <div className="font-semibold">{fmtMoney(totals.totalPaid, currency)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Outstanding</div>
              <div className="font-semibold">{fmtMoney(totals.outstandingTotal, currency)}</div>
            </div>
          </div>

          {/* Installment calendar (monthly) */}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {schedule.map((r, i) => (
              <span key={i} className="px-2 py-1 rounded-full border bg-white">
                #{r.installment ?? r.period ?? i + 1}: {asDate(r.dueDate || r.date)}
              </span>
            ))}
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
                <th className="p-2 border">Total P&I</th>
                <th className="p-2 border">Penalty</th>
                <th className="p-2 border">Fees</th>
                <th className="p-2 border">Paid Principal</th>
                <th className="p-2 border">Paid Interest</th>
                <th className="p-2 border">Outstanding</th>
                <th className="p-2 border">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {schedule.map((r, i) => {
                const idx = r.installment ?? r.period ?? i + 1;
                const pi = Number(r.principal || 0) + Number(r.interest || 0);
                const status = r.paid || r.settled ? 'Settled' : 'Pending';
                return (
                  <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}>
                    <td className="border px-2 py-1 whitespace-nowrap">{idx}</td>
                    <td className="border px-2 py-1 whitespace-nowrap">{asDate(r.dueDate || r.date)}</td>
                    <td className="border px-2 py-1 whitespace-nowrap">{fmtMoney(r.principal, currency)}</td>
                    <td className="border px-2 py-1 whitespace-nowrap">{fmtMoney(r.interest, currency)}</td>
                    <td className="border px-2 py-1 whitespace-nowrap">{fmtMoney(pi, currency)}</td>
                    <td className="border px-2 py-1 whitespace-nowrap">{fmtMoney(r.penalty || 0, currency)}</td>
                    <td className="border px-2 py-1 whitespace-nowrap">{fmtMoney(r.fee ?? r.fees ?? 0, currency)}</td>
                    <td className="border px-2 py-1 whitespace-nowrap">
                      {r.paidPrincipal != null ? fmtMoney(r.paidPrincipal, currency) : '—'}
                    </td>
                    <td className="border px-2 py-1 whitespace-nowrap">
                      {r.paidInterest != null ? fmtMoney(r.paidInterest, currency) : '—'}
                    </td>
                    <td className="border px-2 py-1 whitespace-nowrap">
                      {r.balance != null ? fmtMoney(r.balance, currency) : '—'}
                    </td>
                    <td className="border px-2 py-1 whitespace-nowrap">
                      {status === 'Settled' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                          Settled
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                          Pending
                        </span>
                      )}
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
