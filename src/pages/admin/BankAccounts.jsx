// src/pages/admin/BankAccounts.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function BankAccounts(){
  return (
    <CrudList
      title="Bank Accounts"
      slug="bank-accounts"
      fields={[{key:"name",label:"Name"},{key:"number",label:"Account Number"},{key:"active",label:"Active",type:"checkbox"}]}
      newItem={{ name:"", number:"", active:true }}
    />
  );
}