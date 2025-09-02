// src/pages/admin/RenameBorrowerReports.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function RenameBorrowerReports() {
  return (
    <CrudList
      title="Rename Borrower Reports"
      slug="rename-borrower-reports"
      fields={[{ key:"oldName",label:"Old Name" }, { key:"newName",label:"New Name" }]}
      newItem={{ oldName:"", newName:"" }}
    />
  );
}