// src/pages/admin/EmailLogs.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function EmailLogs(){
  return (
    <CrudList
      title="Email Logs"
      slug="email-logs"
      fields={[{key:"to",label:"To"},{key:"subject",label:"Subject"},{key:"status",label:"Status"},{key:"date",label:"Date"}]}
      newItem={{ to:"", subject:"", status:"QUEUED", date:"" }}
    />
  );
}