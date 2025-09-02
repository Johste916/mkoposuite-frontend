// src/pages/admin/ESignatureSettings.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function ESignatureSettings(){
  return (
    <CrudList
      title="E-Signature Settings"
      slug="e-signature-settings"
      fields={[{key:"provider",label:"Provider"},{key:"apiKey",label:"API Key"}]}
      newItem={{ provider:"", apiKey:"" }}
    />
  );
}
