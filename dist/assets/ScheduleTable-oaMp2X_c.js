const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/jspdf.es.min-DH1vcNv6.js","assets/index-DSXeOGvG.js","assets/index-IEvDIlVn.css"])))=>i.map(i=>d[i]);
import{_ as E,j as m}from"./index-DSXeOGvG.js";const n=(e,s="TZS")=>`‎${s} ${Number(e||0).toLocaleString()}`,O=e=>e?new Date(e).toLocaleDateString():"—",B=e=>e?new Date(e).toLocaleString():"",I=e=>{if(!e)return"";const s=new Date(e);return Number.isNaN(s.getTime())?String(e).slice(0,10):s.toISOString().slice(0,10)};function R(e){return e?Array.isArray(e)?e:Array.isArray(e.schedule)?e.schedule:Array.isArray(e.rows)?e.rows:Array.isArray(e.data)?e.data:null:null}function T(e=[],s=0){let t=Number(s||0),i=0,d=0,u=0,h=0;for(const a of e){const l=Number(a.fee??a.fees??0),o=Number(a.penalty??0),p=Number(a.interest??0),S=Number(a.principal??0);if(t<=0)break;const P=Math.min(t,l);if(h+=P,t-=P,t<=0)break;const g=Math.min(t,o);if(u+=g,t-=g,t<=0)break;const c=Math.min(t,p);if(d+=c,t-=c,t<=0)break;const x=Math.min(t,S);i+=x,t-=x}return{paidPrincipal:i,paidInterest:d,paidPenalty:u,paidFees:h}}const _=e=>{const s=Number((e==null?void 0:e.principal)||0),t=Number((e==null?void 0:e.interest)||0),i=Number((e==null?void 0:e.penalty)||0),d=Number((e==null?void 0:e.fee)??(e==null?void 0:e.fees)??0),u=s+t;return(e==null?void 0:e.balance)!=null?Number(e.balance):e!=null&&e.paid||e!=null&&e.settled?0:(e==null?void 0:e.total)!=null?Number(e.total):u+i+d},j=["#","Due Date","Principal","Interest","Total P&I","Penalty","Fees","Paid Principal","Paid Interest","Outstanding","Status"];function $(e=[]){const s=[];for(let t=0;t<e.length;t++){const i=e[t],d=Number(i.principal||0),u=Number(i.interest||0),h=Number(i.penalty||0),a=Number(i.fee??i.fees??0),l=i.total!=null?Number(i.total):d+u+h+a,o=i.paidPrincipal!=null?Number(i.paidPrincipal):null,p=i.paidInterest!=null?Number(i.paidInterest):null,S=i.paidPenalty!=null?Number(i.paidPenalty):0,P=(i.paidFees!=null?Number(i.paidFees):0)+(i.paidFee?Number(i.paidFee):0),g=!!(i.paid||i.settled),c=i.balance!=null?Number(i.balance):o!=null&&p!=null?Math.max(l-(o+p+S+P),0):g?0:l;s.push({idx:i.installment??i.period??t+1,dueDateISO:I(i.dueDate??i.date??""),principal:d,interest:u,penalty:h,fees:a,pi:d+u,paidP:o,paidI:p,outstanding:c,status:g?"Settled":"Pending"})}return s}function A(e=[],s=[]){const t=Array.isArray(e)?e:[],i=r=>t.reduce((b,D)=>b+Number((D==null?void 0:D[r])||0),0),d=i("principal"),u=i("interest"),h=i("penalty"),a=i("fee")+i("fees"),l=i("total")||d+u+h+a,o=(Array.isArray(s)?s:[]).reduce((r,b)=>r+Number(b.amount||0),0),p=i("paidPrincipal")||0,S=i("paidInterest")||0,P=i("paidPenalty")||0,g=i("paidFees")+i("paidFee")||0,x=p+S+P+g>0?{paidPrincipal:p,paidInterest:S,paidPenalty:P,paidFees:g}:T(t,o),f=Math.max(l-o,0),N=t.find(r=>r.paid||r.settled?!1:Number(r.balance??Number(r.total||0))>0)||null,v=N?{idx:N.installment??N.period??t.indexOf(N)+1,date:N.dueDate||N.date||null,amount:Number(N.total??0)}:null;return{scheduledPrincipal:d,scheduledInterest:u,scheduledPenalty:h,scheduledFees:a,scheduledTotal:l,totalPaid:o,outstanding:f,outstandingTotal:f,nextDue:v,...x}}function M({loan:e,schedule:s=[],currency:t="TZS",method:i="",company:d={}}){var x;if(!s.length)return;const u=[["Company",d.name||""],["Address",d.address||""],["Phone",d.phone||""],["Email",d.email||""],["Website",d.website||""],[],["Loan ID",(e==null?void 0:e.id)??""],["Borrower",((x=e==null?void 0:e.Borrower)==null?void 0:x.name)||(e==null?void 0:e.borrowerName)||""],["Status",(e==null?void 0:e.status)||""],["Currency",t],["Interest Method",i||(e==null?void 0:e.interestMethod)||""],["Disbursed",I((e==null?void 0:e.releaseDate)||(e==null?void 0:e.startDate)||"")],["Generated At",new Date().toLocaleString()],[]],h=j.slice(0,-1).concat("Settled"),a=$(s).map(f=>[f.idx,f.dueDateISO,f.principal,f.interest,f.pi,f.penalty,f.fees,f.paidP??"",f.paidI??"",f.outstanding,f.status==="Settled"?"YES":"NO"]),l=A(s,[]),o=[[],["Totals","",l.scheduledPrincipal,l.scheduledInterest,l.scheduledPrincipal+l.scheduledInterest,l.scheduledPenalty,l.scheduledFees,l.paidPrincipal,l.paidInterest,l.outstanding,""],["Total Paid","","","","","","","","",l.totalPaid,""]],S=[...u,h,...a,...o].map(f=>f.map(N=>`"${String(N??"").replace(/"/g,'""')}"`).join(",")).join(`
`),P=new Blob([S],{type:"text/csv;charset=utf-8;"}),g=URL.createObjectURL(P),c=document.createElement("a");c.href=g,c.download=`loan_${(e==null?void 0:e.id)??"schedule"}.csv`,c.click(),URL.revokeObjectURL(g)}async function U({loan:e,schedule:s=[],currency:t="TZS",method:i="",company:d={}}){var N,v;if(!s.length)return;let u,h;try{u=(await E(async()=>{const{default:r}=await import("./jspdf.es.min-DH1vcNv6.js").then(b=>b.j);return{default:r}},__vite__mapDeps([0,1,2]))).default,h=(await E(async()=>{const{default:r}=await import("./jspdf.plugin.autotable-CfO62xhj.js");return{default:r}},[])).default}catch{return y({loan:e,schedule:s,currency:t,method:i,company:d})}const a=new u({unit:"pt",format:"a4"}),l=a.internal.pageSize.getWidth(),o=40;let p=40;if(d.logoUrl)try{const r=await fetch(d.logoUrl).then(F=>F.blob()),b=new FileReader,D=new Promise(F=>{b.onload=()=>F(b.result)});b.readAsDataURL(r);const L=await D;a.addImage(L,"PNG",o,p,120,40)}catch{}a.setFontSize(14),a.text(d.name||"Company",o,p+65),a.setFontSize(10),[d.address,[d.phone,d.email].filter(Boolean).join("  •  "),d.website].filter(Boolean).forEach((r,b)=>a.text(String(r),o,p+80+b*14)),a.setFontSize(16),a.text("Loan Repayment Schedule",l-40,50,{align:"right"}),a.setFontSize(10),[`Loan ID: ${(e==null?void 0:e.id)??""}`,`Borrower: ${((N=e==null?void 0:e.Borrower)==null?void 0:N.name)||(e==null?void 0:e.borrowerName)||""}`,`Status: ${(e==null?void 0:e.status)||""}`,`Currency: ${t}`,`Interest Method: ${i||(e==null?void 0:e.interestMethod)||""}`,`Disbursed: ${I((e==null?void 0:e.releaseDate)||(e==null?void 0:e.startDate)||"")}`,`Generated: ${new Date().toLocaleString()}`].forEach((r,b)=>a.text(r,l-40,68+b*14,{align:"right"}));const P=[{header:"#",dataKey:"idx"},{header:"Due Date",dataKey:"dueDate"},{header:"Principal",dataKey:"principal"},{header:"Interest",dataKey:"interest"},{header:"Total P&I",dataKey:"pi"},{header:"Penalty",dataKey:"penalty"},{header:"Fees",dataKey:"fees"},{header:"Paid Principal",dataKey:"paidP"},{header:"Paid Interest",dataKey:"paidI"},{header:"Outstanding",dataKey:"outstanding"},{header:"Settled",dataKey:"settled"}],g=$(s).map(r=>({idx:r.idx,dueDate:r.dueDateISO,principal:n(r.principal,t),interest:n(r.interest,t),pi:n(r.pi,t),penalty:n(r.penalty,t),fees:n(r.fees,t),paidP:r.paidP==null?"—":n(r.paidP,t),paidI:r.paidI==null?"—":n(r.paidI,t),outstanding:n(r.outstanding,t),settled:r.status==="Settled"?"YES":"NO"}));h(a,{head:[P.map(r=>r.header)],body:g.map(r=>P.map(b=>r[b.dataKey])),startY:140,styles:{fontSize:9},headStyles:{fillColor:[243,244,246],textColor:20},alternateRowStyles:{fillColor:[250,250,250]},margin:{left:40,right:40},didDrawPage:()=>{const r=`Page ${a.internal.getNumberOfPages()}`;a.setFontSize(9),a.text(r,l-40,a.internal.pageSize.getHeight()-20,{align:"right"})}});const c=A(s,[]);let x=((v=a.lastAutoTable)==null?void 0:v.finalY)||140;x+=16,a.setFontSize(11),a.text("Summary",40,x),x+=8,a.setFontSize(10),[["Principal (Sched.)",n(c.scheduledPrincipal,t)],["Interest (Sched.)",n(c.scheduledInterest,t)],["Total P&I (Sched.)",n(c.scheduledPrincipal+c.scheduledInterest,t)],["Penalty (Sched.)",n(c.scheduledPenalty,t)],["Fees (Sched.)",n(c.scheduledFees,t)],["Total Payable",n(c.scheduledTotal,t)],["Paid Principal",n(c.paidPrincipal,t)],["Paid Interest",n(c.paidInterest,t)],["Total Paid",n(c.totalPaid,t)],["Outstanding",n(c.outstanding,t)]].forEach((r,b)=>{a.text(r[0],40,x+16+b*14),a.text(r[1],l-40,x+16+b*14,{align:"right"})}),a.save(`loan_${(e==null?void 0:e.id)??"schedule"}.pdf`)}function y({loan:e,schedule:s=[],currency:t,method:i,company:d}){var o;const u=$(s).map(p=>`
      <tr>
        <td>${p.idx}</td>
        <td>${p.dueDateISO}</td>
        <td>${n(p.principal,t)}</td>
        <td>${n(p.interest,t)}</td>
        <td>${n(p.pi,t)}</td>
        <td>${n(p.penalty,t)}</td>
        <td>${n(p.fees,t)}</td>
        <td>${p.paidP==null?"—":n(p.paidP,t)}</td>
        <td>${p.paidI==null?"—":n(p.paidI,t)}</td>
        <td>${n(p.outstanding,t)}</td>
        <td>${p.status==="Settled"?"YES":"NO"}</td>
      </tr>`).join(""),h=d!=null&&d.logoUrl?`<img src="${d.logoUrl}" style="height:48px;object-fit:contain;margin-right:12px;" />`:"",a=`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Loan ${(e==null?void 0:e.id)??""} Schedule</title>
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
              ${h}
              <div>
                <h1>${(d==null?void 0:d.name)||""}</h1>
                <div class="muted">
                  ${[d==null?void 0:d.address,d==null?void 0:d.phone,d==null?void 0:d.email,d==null?void 0:d.website].filter(Boolean).join(" • ")}
                </div>
              </div>
            </div>
            <div>
              <div style="font-weight:600;">Loan Repayment Schedule</div>
              <div class="muted">Generated: ${new Date().toLocaleString()}</div>
            </div>
          </div>

          <div style="margin-top:12px;font-size:12px;">
            <div><b>Loan ID:</b> ${(e==null?void 0:e.id)??""}</div>
            <div><b>Borrower:</b> ${((o=e==null?void 0:e.Borrower)==null?void 0:o.name)||(e==null?void 0:e.borrowerName)||""}</div>
            <div><b>Status:</b> ${(e==null?void 0:e.status)||""}</div>
            <div><b>Currency:</b> ${(e==null?void 0:e.currency)||t} &nbsp; • &nbsp; <b>Interest Method:</b> ${i||(e==null?void 0:e.interestMethod)||""}</div>
            <div><b>Disbursed:</b> ${I((e==null?void 0:e.releaseDate)||(e==null?void 0:e.startDate)||"")}</div>
          </div>

          <table>
            <thead>
              <tr>${j.map(p=>`<th>${p}</th>`).join("")}<th>Settled</th></tr>
            </thead>
            <tbody>${u}</tbody>
          </table>

          <div class="no-print" style="margin-top:16px;">
            <button onclick="window.print()" style="padding:8px 12px;border:1px solid #E5E7EB;border-radius:8px;background:white;cursor:pointer;">Print / Save as PDF</button>
          </div>
        </div>
      </body>
    </html>
  `,l=window.open("","_blank","noopener,noreferrer,width=1024,height=768");l&&(l.document.open(),l.document.write(a),l.document.close())}const k=(e=[],s="TZS")=>(Array.isArray(e)?e:[]).map((t,i)=>{const d=Number(t.principal||0),u=Number(t.interest||0),h=Number(t.penalty||0),a=Number(t.fee??t.fees??0),l=d+u,o=_(t);return{idx:t.installment??t.period??i+1,dueDate:I(t.dueDate??t.date??""),principal:n(d,s),interest:n(u,s),pi:n(l,s),penalty:n(h,s),fees:n(a,s),paidP:t.paidPrincipal!=null?n(Number(t.paidPrincipal),s):"—",paidI:t.paidInterest!=null?n(Number(t.paidInterest),s):"—",outstanding:n(o,s),settled:t.paid||t.settled?"YES":"NO"}}),C=(e=[])=>(Array.isArray(e)?e:[]).map((s,t)=>{const i=Number(s.principal||0),d=Number(s.interest||0),u=Number(s.penalty||0),h=Number(s.fee??s.fees??0),a=i+d,l=_(s);return{idx:s.installment??s.period??t+1,dueDate:I(s.dueDate??s.date??""),principal:i,interest:d,pi:a,penalty:u,fees:h,paidP:s.paidPrincipal!=null?Number(s.paidPrincipal):"",paidI:s.paidInterest!=null?Number(s.paidInterest):"",outstanding:l,settled:s.paid||s.settled?"YES":"NO"}}),w=e=>e==="Settled"?"px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200":"px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200";function K({schedule:e=[],currency:s="TZS"}){const t=$(e);return m.jsx("div",{className:"overflow-auto rounded border shadow bg-white",children:m.jsxs("table",{className:"min-w-full",children:[m.jsx("thead",{className:"bg-gray-100 sticky top-0 z-10",children:m.jsx("tr",{className:"text-left text-sm",children:j.map(i=>m.jsx("th",{className:"p-2 border-b font-semibold",children:i},i))})}),m.jsx("tbody",{className:"text-sm",children:t.map((i,d)=>m.jsxs("tr",{className:d%2?"bg-gray-50":"",children:[m.jsx("td",{className:"p-2 border",children:i.idx}),m.jsx("td",{className:"p-2 border whitespace-nowrap",children:O(i.dueDateISO)}),m.jsx("td",{className:"p-2 border text-right",children:n(i.principal,s)}),m.jsx("td",{className:"p-2 border text-right",children:n(i.interest,s)}),m.jsx("td",{className:"p-2 border text-right",children:n(i.pi,s)}),m.jsx("td",{className:"p-2 border text-right",children:n(i.penalty,s)}),m.jsx("td",{className:"p-2 border text-right",children:n(i.fees,s)}),m.jsx("td",{className:"p-2 border text-right",children:i.paidP==null?"—":n(i.paidP,s)}),m.jsx("td",{className:"p-2 border text-right",children:i.paidI==null?"—":n(i.paidI,s)}),m.jsx("td",{className:"p-2 border text-right",children:n(i.outstanding,s)}),m.jsx("td",{className:"p-2 border",children:m.jsx("span",{className:w(i.status),children:i.status})})]},d))})]})})}export{K as S,C as a,j as b,A as c,O as d,M as e,n as f,U as g,B as h,I as i,R as n,k as r};
