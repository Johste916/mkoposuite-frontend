// pages/banks/BankImport.jsx
import React from "react";
const card="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 md:p-7";
export default function BankImport(){
  return (<div className="p-4 md:p-6 lg:p-8">
    <h1 className="text-2xl font-bold mb-4">Import Bank CSV</h1>
    <section className={card}>
      <p className="text-sm text-gray-600">Stub page. Hook your CSV parser here and POST to /banks/:id/transactions in a loop.</p>
    </section>
  </div>);
}
