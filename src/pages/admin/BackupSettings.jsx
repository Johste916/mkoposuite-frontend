import React from "react";
import SettingsEditor from "./_shared/SettingsEditor";

export default function BackupSettings(){
  return (
    <SettingsEditor
      title="Backup Settings"
      prefix="backup."
      fields={[
        { key:"provider", label:"Provider", type:"select", options:[
          { value:"none", label:"None" },
          { value:"s3",   label:"Amazon S3 / S3-compatible" },
          { value:"gcs",  label:"Google Cloud Storage" },
        ], default:"none" },
        { key:"bucket", label:"Bucket/Container", type:"text", placeholder:"my-backups" },
        { key:"accessKey", label:"Access Key", type:"text" },
        { key:"secretKey", label:"Secret Key", type:"secret" },
        { key:"region", label:"Region", type:"text", placeholder:"eu-central-1" },
        { key:"prefix", label:"Path Prefix", type:"text", placeholder:"mkoposuite" },
        { key:"cron", label:"Automatic Schedule (cron)", type:"text", placeholder:"0 3 * * *" },
        { key:"enabled", label:"Enable automatic backups", type:"boolean", default:false },
      ]}
    />
  );
}
