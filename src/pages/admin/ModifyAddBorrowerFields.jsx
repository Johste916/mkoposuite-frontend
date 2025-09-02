// src/pages/admin/ModifyAddBorrowerFields.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function ModifyAddBorrowerFields() {
  return (
    <CrudList
      title="Modify Add Borrower Fields"
      slug="modify-add-borrower-fields"
      fields={[{ key:"field",label:"Field" }, { key:"type",label:"Type" }, { key:"required",label:"Required",type:"checkbox" }]}
      newItem={{ field:"", type:"text", required:false }}
    />
  );
}