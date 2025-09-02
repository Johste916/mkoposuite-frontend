// src/pages/admin/DownloadStatementsSchedules.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function DownloadStatementsSchedules(){
  return (
    <CrudList
      title="Download Statements/Schedules"
      slug="download-statements-schedules"
      fields={[{key:"type",label:"Type"},{key:"template",label:"Template"}]}
      newItem={{ type:"statement", template:"" }}
    />
  );
}
