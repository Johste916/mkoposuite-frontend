// src/pages/admin/ManageLoanOfficers.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function ManageLoanOfficers() {
  return (
    <CrudList
      title="Manage Loan Officers"
      slug="manage-loan-officers"
      fields={[{ key:"name",label:"Name" }, { key:"code",label:"Code" }, { key:"phone",label:"Phone" }, { key:"active",label:"Active",type:"checkbox" }]}
      newItem={{ name:"", code:"", phone:"", active:true }}
    />
  );
}