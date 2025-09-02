import React from "react";
import TextTemplateEditor from "./_shared/TextTemplateEditor";
import { AdminAPI } from "../../api/admin";

export default function EmailTemplates() {
  return (
    <TextTemplateEditor
      title="Email Templates"
      loader={() => AdminAPI.listTemplates("email")}
      creator={(payload) => AdminAPI.createTemplate({ ...payload, channel: "email" })}
      updater={(id, patch) => AdminAPI.updateTemplate(id, { ...patch, channel: "email" })}
      remover={(id) => AdminAPI.deleteTemplate(id)}
      fields={{ showSubject: true, fixedChannel: "email" }}
    />
  );
}
