// src/pages/admin/Taxes.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function Taxes(){
  return (
    <CrudList
      title="Taxes"
      slug="taxes"
      fields={[{key:"name",label:"Name"},{key:"rate",label:"Rate %",type:"number"}]}
      newItem={{ name:"", rate:0 }}
    />
  );
}