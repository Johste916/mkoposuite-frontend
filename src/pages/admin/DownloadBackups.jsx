// src/pages/admin/DownloadBackups.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function DownloadBackups(){
  return (
    <CrudList
      title="Download Backups"
      slug="download-backups"
      fields={[{key:"filename",label:"File Name"},{key:"createdAt",label:"Created At"}]}
      newItem={{ filename:"", createdAt:"" }}
    />
  );
}