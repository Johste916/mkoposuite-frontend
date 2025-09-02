// src/pages/admin/RenameInvestorReport.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function RenameInvestorReport(){
  return (
    <CrudList
      title="Rename Investor Report"
      slug="rename-investor-report"
      fields={[{key:"oldName",label:"Old Name"},{key:"newName",label:"New Name"}]}
      newItem={{ oldName:"", newName:"" }}
    />
  );
}