// src/pages/admin/CollectionSheetsEmailTemplate.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function CollectionSheetsEmailTemplate(){
  return (
    <CrudList
      title="Collection Sheets - Email Template"
      slug="collection-sheets-email-template"
      fields={[{key:"name",label:"Name"},{key:"subject",label:"Subject"},{key:"body",label:"Body"}]}
      newItem={{ name:"", subject:"", body:"" }}
    />
  );
}