// src/pages/admin/BulkUpdateBorrowersLoanOfficers.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function BulkUpdateBorrowersLoanOfficers() {
  return (
    <CrudList
      title="Bulk Update Borrowers With Loan Officers"
      slug="bulk-update-borrowers-with-loan-officers"
      fields={[{ key:"officerCode",label:"Officer Code" }, { key:"criteria",label:"Criteria" }]}
      newItem={{ officerCode:"", criteria:"" }}
    />
  );
}