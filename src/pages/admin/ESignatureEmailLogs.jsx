// src/pages/admin/ESignatureEmailLogs.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function ESignatureEmailLogs(){
  return (
    <CrudList
      title="E-Signature Email Logs"
      slug="e-signature-email-logs"
      fields={[{key:"to",label:"To"},{key:"doc",label:"Document"},{key:"status",label:"Status"},{key:"date",label:"Date"}]}
      newItem={{ to:"", doc:"", status:"SENT", date:"" }}
    />
  );
}