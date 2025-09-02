// src/pages/admin/AutoSendEmails.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function AutoSendEmails(){
  return (
    <CrudList
      title="Auto Send Emails"
      slug="auto-send-emails"
      fields={[{key:"event",label:"Event"},{key:"template",label:"Template"},{key:"active",label:"Active",type:"checkbox"}]}
      newItem={{ event:"", template:"", active:true }}
    />
  );
}
