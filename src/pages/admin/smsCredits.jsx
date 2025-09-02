// src/pages/admin/SmsCredits.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function SmsCredits(){
  return (
    <CrudList
      title="SMS Credits"
      slug="sms-credits"
      fields={[{key:"provider",label:"Provider"},{key:"balance",label:"Balance",type:"number"}]}
      newItem={{ provider:"", balance:0 }}
    />
  );
}
