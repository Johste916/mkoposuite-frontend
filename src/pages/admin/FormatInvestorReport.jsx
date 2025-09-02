// src/pages/admin/FormatInvestorReport.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function FormatInvestorReport(){
  return (
    <CrudList
      title="Format Investor Report"
      slug="format-investor-report"
      fields={[{key:"report",label:"Report"},{key:"format",label:"Format"}]}
      newItem={{ report:"", format:"" }}
    />
  );
}