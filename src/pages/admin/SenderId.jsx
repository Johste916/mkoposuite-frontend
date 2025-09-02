// src/pages/admin/SenderId.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function SenderId(){
  return (
    <CrudList
      title="Sender ID"
      slug="sender-id"
      fields={[{key:"senderId",label:"Sender ID"},{key:"approved",label:"Approved",type:"checkbox"}]}
      newItem={{ senderId:"", approved:false }}
    />
  );
}