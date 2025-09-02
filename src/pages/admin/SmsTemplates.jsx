import React from "react";
import TextTemplateEditor from "./_shared/TextTemplateEditor";
import { AdminAPI } from "../../api/admin";

export default function SmsTemplates() {
  return (
    <TextTemplateEditor
      title="SMS Templates"
      loader={() => AdminAPI.listTemplates("sms")}
      creator={(payload) => AdminAPI.createTemplate({ ...payload, channel: "sms" })}
      updater={(id, patch) => AdminAPI.updateTemplate(id, { ...patch, channel: "sms" })}
      remover={(id) => AdminAPI.deleteTemplate(id)}
      fields={{ showSubject: false, fixedChannel: "sms" }}
    />
  );
}
