// src/pages/admin/CollectionSheetsSmsTemplate.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function CollectionSheetsSmsTemplate(){
  return (
    <CrudList
      title="Collection Sheets - SMS Template"
      slug="collection-sheets-sms-template"
      fields={[{key:"name",label:"Name"},{key:"body",label:"Body"}]}
      newItem={{ name:"", body:"" }}
    />
  );
}
