// src/pages/admin/FormatBorrowerReports.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function FormatBorrowerReports() {
  return (
    <CrudList
      title="Format Borrower Reports"
      slug="format-borrower-reports"
      fields={[{ key:"name",label:"Report Name" }, { key:"format",label:"Format Code" }]}
      newItem={{ name:"", format:"" }}
    />
  );
}