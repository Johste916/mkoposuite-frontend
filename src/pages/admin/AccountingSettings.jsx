// src/pages/admin/AccountingSettings.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function AccountingSettings(){
  return (
    <CrudList
      title="Accounting Settings"
      slug="settings"
      fields={[{key:"key",label:"Key"},{key:"value",label:"Value"}]}
      newItem={{ key:"", value:"" }}
    />
  );
}