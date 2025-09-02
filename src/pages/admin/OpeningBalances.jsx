// src/pages/admin/OpeningBalances.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function OpeningBalances(){
  return (
    <CrudList
      title="Opening Balances"
      slug="opening-balances"
      fields={[{key:"account",label:"Account"},{key:"debit",label:"Debit",type:"number"},{key:"credit",label:"Credit",type:"number"}]}
      newItem={{ account:"", debit:0, credit:0 }}
    />
  );
}