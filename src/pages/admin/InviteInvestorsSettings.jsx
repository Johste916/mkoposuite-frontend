// src/pages/admin/InviteInvestorsSettings.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function InviteInvestorsSettings(){
  return (
    <CrudList
      title="Invite Investors Settings"
      slug="invite-investors-settings"
      fields={[{key:"channel",label:"Channel"},{key:"template",label:"Template Code"},{key:"active",label:"Active",type:"checkbox"}]}
      newItem={{ channel:"email", template:"", active:true }}
    />
  );
}