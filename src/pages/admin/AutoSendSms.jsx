// src/pages/admin/AutoSendSms.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function AutoSendSms(){
  return (
    <CrudList
      title="Auto Send SMS"
      slug="auto-send-sms"
      fields={[{key:"event",label:"Event"},{key:"template",label:"Template"},{key:"active",label:"Active",type:"checkbox"}]}
      newItem={{ event:"", template:"", active:true }}
    />
  );
}