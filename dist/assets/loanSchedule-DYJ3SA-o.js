const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/jspdf.es.min-DxSLNTZN.js","assets/index-BdJ97RMf.js","assets/index-OWYBtRxn.css"])))=>i.map(i=>d[i]);
import{_ as E}from"./index-BdJ97RMf.js";const r=(e,s="TZS")=>`‎${s} ${Number(e||0).toLocaleString()}`,z=e=>e?new Date(e).toLocaleDateString():"—",I=e=>{if(!e)return"";const s=new Date(e);return Number.isNaN(s.getTime())?String(e).slice(0,10):s.toISOString().slice(0,10)};function k(e){return e?Array.isArray(e)?e:Array.isArray(e.schedule)?e.schedule:Array.isArray(e.rows)?e.rows:Array.isArray(e.data)?e.data:null:null}function T(e=[],s=0){let t=Number(s||0),p=0,i=0,u=0,h=0;for(const d of e){const n=Number(d.fee??d.fees??0),c=Number(d.penalty??0),l=Number(d.interest??0),g=Number(d.principal??0);if(t<=0)break;const f=Math.min(t,n);if(h+=f,t-=f,t<=0)break;const P=Math.min(t,c);if(u+=P,t-=P,t<=0)break;const x=Math.min(t,l);if(i+=x,t-=x,t<=0)break;const b=Math.min(t,g);p+=b,t-=b}return{paidPrincipal:p,paidInterest:i,paidPenalty:u,paidFees:h}}const v=e=>{const s=Number((e==null?void 0:e.principal)||0),t=Number((e==null?void 0:e.interest)||0),p=Number((e==null?void 0:e.penalty)||0),i=Number((e==null?void 0:e.fee)??(e==null?void 0:e.fees)??0),u=(e==null?void 0:e.total)!=null?Number(e.total):s+t+p+i;if((e==null?void 0:e.balance)!=null&&!Number.isNaN(Number(e.balance)))return Number(e.balance);if((e==null?void 0:e.paidPrincipal)!=null||(e==null?void 0:e.paidInterest)!=null||(e==null?void 0:e.paidPenalty)!=null||(e==null?void 0:e.paidFees)!=null||(e==null?void 0:e.paidFee)!=null){const d=Number(e.paidPrincipal||0),n=Number(e.paidInterest||0),c=Number(e.paidPenalty||0),l=Number(e.paidFees||0)+Number(e.paidFee||0);return Math.max(u-(d+n+c+l),0)}return u},_=["#","Due Date","Principal","Interest","Total P&I","Penalty","Fees","Paid Principal","Paid Interest","Outstanding","Status"];function F(e=[]){const s=[];for(let p=0;p<e.length;p++){const i=e[p],u=Number(i.principal||0),h=Number(i.interest||0),d=Number(i.penalty||0),n=Number(i.fee??i.fees??0),c=i.paidPrincipal!=null?Number(i.paidPrincipal):null,l=i.paidInterest!=null?Number(i.paidInterest):null,g=v(i),f=g<=1e-6?"Settled":"Pending";s.push({idx:i.installment??i.period??p+1,dueDateISO:I(i.dueDate??i.date??""),principal:u,interest:h,penalty:d,fees:n,pi:u+h,paidP:c,paidI:l,outstanding:g,status:f})}return s}function A(e=[],s=[]){const t=Array.isArray(e)?e:[],p=N=>t.reduce((a,m)=>a+Number((m==null?void 0:m[N])||0),0),i=p("principal"),u=p("interest"),h=p("penalty"),d=p("fee")+p("fees"),n=p("total")||i+u+h+d,c=(Array.isArray(s)?s:[]).reduce((N,a)=>N+Number(a.amount||0),0),l=p("paidPrincipal")||0,g=p("paidInterest")||0,f=p("paidPenalty")||0,P=p("paidFees")+p("paidFee")||0,b=l+g+f+P>0?{paidPrincipal:l,paidInterest:g,paidPenalty:f,paidFees:P}:T(t,c),o=Math.max(n-c,0),S=t.find(N=>v(N)>0)||null,D=S?{idx:S.installment??S.period??t.indexOf(S)+1,date:S.dueDate||S.date||null,amount:Number(S.total??0)}:null;return{scheduledPrincipal:i,scheduledInterest:u,scheduledPenalty:h,scheduledFees:d,scheduledTotal:n,totalPaid:c,outstanding:o,outstandingTotal:o,nextDue:D,...b}}function M({loan:e,schedule:s=[],currency:t="TZS",method:p="",company:i={}}){var b;if(!s.length)return;const u=[["Company",i.name||""],["Address",i.address||""],["Phone",i.phone||""],["Email",i.email||""],["Website",i.website||""],[],["Loan ID",(e==null?void 0:e.id)??""],["Borrower",((b=e==null?void 0:e.Borrower)==null?void 0:b.name)||(e==null?void 0:e.borrowerName)||""],["Status",(e==null?void 0:e.status)||""],["Currency",t],["Interest Method",p||(e==null?void 0:e.interestMethod)||""],["Disbursed",I((e==null?void 0:e.releaseDate)||(e==null?void 0:e.startDate)||"")],["Generated At",new Date().toLocaleString()],[]],h=_.slice(0,-1).concat("Settled"),d=F(s).map(o=>[o.idx,o.dueDateISO,o.principal,o.interest,o.pi,o.penalty,o.fees,o.paidP??"",o.paidI??"",o.outstanding,o.outstanding<=1e-6?"YES":"NO"]),n=A(s,[]),c=[[],["Totals","",n.scheduledPrincipal,n.scheduledInterest,n.scheduledPrincipal+n.scheduledInterest,n.scheduledPenalty,n.scheduledFees,n.paidPrincipal,n.paidInterest,n.outstanding,""],["Total Paid","","","","","","","","",n.totalPaid,""]],g=[...u,h,...d,...c].map(o=>o.map(S=>`"${String(S??"").replace(/"/g,'""')}"`).join(",")).join(`
`),f=new Blob([g],{type:"text/csv;charset=utf-8;"}),P=URL.createObjectURL(f),x=document.createElement("a");x.href=P,x.download=`loan_${(e==null?void 0:e.id)??"schedule"}.csv`,x.click(),URL.revokeObjectURL(P)}async function R({loan:e,schedule:s=[],currency:t="TZS",method:p="",company:i={}}){var D,N;if(!s.length)return;let u,h;try{u=(await E(async()=>{const{default:a}=await import("./jspdf.es.min-DxSLNTZN.js").then(m=>m.j);return{default:a}},__vite__mapDeps([0,1,2]))).default,h=(await E(async()=>{const{default:a}=await import("./jspdf.plugin.autotable-CfO62xhj.js");return{default:a}},[])).default}catch{return y({loan:e,schedule:s,currency:t,method:p,company:i})}const d=new u({unit:"pt",format:"a4"}),n=d.internal.pageSize.getWidth(),c=40;let l=40;if(i.logoUrl)try{const a=await fetch(i.logoUrl).then($=>$.blob()),m=new FileReader,L=new Promise($=>{m.onload=()=>$(m.result)});m.readAsDataURL(a);const O=await L;d.addImage(O,"PNG",c,l,120,40)}catch{}d.setFontSize(14),d.text(i.name||"Company",c,l+65),d.setFontSize(10),[i.address,[i.phone,i.email].filter(Boolean).join("  •  "),i.website].filter(Boolean).forEach((a,m)=>d.text(String(a),c,l+80+m*14)),d.setFontSize(16),d.text("Loan Repayment Schedule",n-40,50,{align:"right"}),d.setFontSize(10),[`Loan ID: ${(e==null?void 0:e.id)??""}`,`Borrower: ${((D=e==null?void 0:e.Borrower)==null?void 0:D.name)||(e==null?void 0:e.borrowerName)||""}`,`Status: ${(e==null?void 0:e.status)||""}`,`Currency: ${t}`,`Interest Method: ${p||(e==null?void 0:e.interestMethod)||""}`,`Disbursed: ${I((e==null?void 0:e.releaseDate)||(e==null?void 0:e.startDate)||"")}`,`Generated: ${new Date().toLocaleString()}`].forEach((a,m)=>d.text(a,n-40,68+m*14,{align:"right"}));const f=[{header:"#",dataKey:"idx"},{header:"Due Date",dataKey:"dueDate"},{header:"Principal",dataKey:"principal"},{header:"Interest",dataKey:"interest"},{header:"Total P&I",dataKey:"pi"},{header:"Penalty",dataKey:"penalty"},{header:"Fees",dataKey:"fees"},{header:"Paid Principal",dataKey:"paidP"},{header:"Paid Interest",dataKey:"paidI"},{header:"Outstanding",dataKey:"outstanding"},{header:"Settled",dataKey:"settled"}],P=1e-6,x=F(s).map(a=>({idx:a.idx,dueDate:a.dueDateISO,principal:r(a.principal,t),interest:r(a.interest,t),pi:r(a.pi,t),penalty:r(a.penalty,t),fees:r(a.fees,t),paidP:a.paidP==null?"—":r(a.paidP,t),paidI:a.paidI==null?"—":r(a.paidI,t),outstanding:r(a.outstanding,t),settled:a.outstanding<=P?"YES":"NO"}));h(d,{head:[f.map(a=>a.header)],body:x.map(a=>f.map(m=>a[m.dataKey])),startY:140,styles:{fontSize:9},headStyles:{fillColor:[243,244,246],textColor:20},alternateRowStyles:{fillColor:[250,250,250]},margin:{left:40,right:40},didDrawPage:()=>{const a=`Page ${d.internal.getNumberOfPages()}`;d.setFontSize(9),d.text(a,n-40,d.internal.pageSize.getHeight()-20,{align:"right"})}});const b=A(s,[]);let o=((N=d.lastAutoTable)==null?void 0:N.finalY)||140;o+=16,d.setFontSize(11),d.text("Summary",40,o),o+=8,d.setFontSize(10),[["Principal (Sched.)",r(b.scheduledPrincipal,t)],["Interest (Sched.)",r(b.scheduledInterest,t)],["Total P&I (Sched.)",r(b.scheduledPrincipal+b.scheduledInterest,t)],["Penalty (Sched.)",r(b.scheduledPenalty,t)],["Fees (Sched.)",r(b.scheduledFees,t)],["Total Payable",r(b.scheduledTotal,t)],["Paid Principal",r(b.paidPrincipal,t)],["Paid Interest",r(b.paidInterest,t)],["Total Paid",r(b.totalPaid,t)],["Outstanding",r(b.outstanding,t)]].forEach((a,m)=>{d.text(a[0],40,o+16+m*14),d.text(a[1],n-40,o+16+m*14,{align:"right"})}),d.save(`loan_${(e==null?void 0:e.id)??"schedule"}.pdf`)}function y({loan:e,schedule:s=[],currency:t,method:p,company:i}){var c;const u=F(s).map(l=>`
      <tr>
        <td>${l.idx}</td>
        <td>${l.dueDateISO}</td>
        <td>${r(l.principal,t)}</td>
        <td>${r(l.interest,t)}</td>
        <td>${r(l.pi,t)}</td>
        <td>${r(l.penalty,t)}</td>
        <td>${r(l.fees,t)}</td>
        <td>${l.paidP==null?"—":r(l.paidP,t)}</td>
        <td>${l.paidI==null?"—":r(l.paidI,t)}</td>
        <td>${r(l.outstanding,t)}</td>
        <td>${l.outstanding<=1e-6?"YES":"NO"}</td>
      </tr>`).join(""),h=i!=null&&i.logoUrl?`<img src="${i.logoUrl}" style="height:48px;object-fit:contain;margin-right:12px;" />`:"",d=`
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
                <h1>${(i==null?void 0:i.name)||""}</h1>
                <div class="muted">
                  ${[i==null?void 0:i.address,i==null?void 0:i.phone,i==null?void 0:i.email,i==null?void 0:i.website].filter(Boolean).join(" • ")}
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
            <div><b>Borrower:</b> ${((c=e==null?void 0:e.Borrower)==null?void 0:c.name)||(e==null?void 0:e.borrowerName)||""}</div>
            <div><b>Status:</b> ${(e==null?void 0:e.status)||""}</div>
            <div><b>Currency:</b> ${(e==null?void 0:e.currency)||t} &nbsp; • &nbsp; <b>Interest Method:</b> ${p||(e==null?void 0:e.interestMethod)||""}</div>
            <div><b>Disbursed:</b> ${I((e==null?void 0:e.releaseDate)||(e==null?void 0:e.startDate)||"")}</div>
          </div>

          <table>
            <thead>
              <tr>${_.map(l=>`<th>${l}</th>`).join("")}<th>Settled</th></tr>
            </thead>
            <tbody>${u}</tbody>
          </table>

          <div class="no-print" style="margin-top:16px;">
            <button onclick="window.print()" style="padding:8px 12px;border:1px solid #E5E7EB;border-radius:8px;background:white;cursor:pointer;">Print / Save as PDF</button>
          </div>
        </div>
      </body>
    </html>
  `,n=window.open("","_blank","noopener,noreferrer,width=1024,height=768");n&&(n.document.open(),n.document.write(d),n.document.close())}const U=(e=[],s="TZS")=>(Array.isArray(e)?e:[]).map((t,p)=>{const i=Number(t.principal||0),u=Number(t.interest||0),h=Number(t.penalty||0),d=Number(t.fee??t.fees??0),n=i+u,c=v(t);return{idx:t.installment??t.period??p+1,dueDate:I(t.dueDate??t.date??""),principal:r(i,s),interest:r(u,s),pi:r(n,s),penalty:r(h,s),fees:r(d,s),paidP:t.paidPrincipal!=null?r(Number(t.paidPrincipal),s):"—",paidI:t.paidInterest!=null?r(Number(t.paidInterest),s):"—",outstanding:r(c,s),settled:c<=1e-6?"YES":"NO"}}),j=(e=[])=>(Array.isArray(e)?e:[]).map((s,t)=>{const p=Number(s.principal||0),i=Number(s.interest||0),u=Number(s.penalty||0),h=Number(s.fee??s.fees??0),d=p+i,n=v(s);return{idx:s.installment??s.period??t+1,dueDate:I(s.dueDate??s.date??""),principal:p,interest:i,pi:d,penalty:u,fees:h,paidP:s.paidPrincipal!=null?Number(s.paidPrincipal):"",paidI:s.paidInterest!=null?Number(s.paidInterest):"",outstanding:n,settled:n<=1e-6?"YES":"NO"}});export{_ as S,j as a,z as b,A as c,M as d,R as e,r as f,I as g,F as m,k as n,U as r};
