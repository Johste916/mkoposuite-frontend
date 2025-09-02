// src/pages/admin/SmsLogs.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function SmsLogs(){
  return (
    <CrudList
      title="SMS Logs"
      slug="sms-logs"
      fields={[{key:"to",label:"To"},{key:"status",label:"Status"},{key:"date",label:"Date"}]}
      newItem={{ to:"", status:"QUEUED", date:"" }}
    />
  );
}