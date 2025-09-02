// src/pages/admin/RenameCollectionSheetHeadings.jsx
import React from "react";
import CrudList from "./_shared/CrudList";
export default function RenameCollectionSheetHeadings() {
  return (
    <CrudList
      title="Rename Collection Sheet Headings"
      slug="rename-collection-sheet-headings"
      fields={[{ key:"field",label:"Field" }, { key:"label",label:"New Label" }]}
      newItem={{ field:"", label:"" }}
    />
  );
}