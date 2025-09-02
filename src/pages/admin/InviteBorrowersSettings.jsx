// src/pages/admin/InviteBorrowersSettings.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function InviteBorrowersSettings() {
  return (
    <CrudList
      title="Invite Borrowers Settings"
      slug="invite-borrowers-settings"
      fields={[{ key:"channel",label:"Channel" }, { key:"template",label:"Template Code" }, { key:"active",label:"Active",type:"checkbox" }]}
      newItem={{ channel:"sms", template:"", active:true }}
    />
  );
}