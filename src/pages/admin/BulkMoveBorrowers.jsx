// src/pages/admin/BulkMoveBorrowers.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function BulkMoveBorrowers() {
  return (
    <CrudList
      title="Bulk Move Borrowers to Another Branch"
      slug="bulk-move-borrowers-to-another-branch"
      fields={[{ key:"fromBranch",label:"From Branch" }, { key:"toBranch",label:"To Branch" }]}
      newItem={{ fromBranch:"", toBranch:"" }}
    />
  );
}