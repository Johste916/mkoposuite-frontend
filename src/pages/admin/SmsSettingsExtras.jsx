import React from "react";
import SettingsEditor from "./_shared/SettingsEditor";
export function SmsCredits(){ return <SettingsEditor title="SMS Credits" prefix="sms." fields={[{key:"credits", label:"Credits", type:"number", default:0}]} />; }
export function SenderId(){ return <SettingsEditor title="Sender ID" prefix="sms." fields={[{key:"senderId", label:"Sender ID", type:"text"}]} />; }
export function AutoSendSms(){ return <SettingsEditor title="Auto Send SMS" prefix="sms.auto." fields={[
  { key:"enabled", label:"Enable auto SMS", type:"boolean", default:false },
  { key:"reminderDaysBefore", label:"Reminder days before due", type:"number", default:2 },
]} />; }
export function CollectionSheetsSmsTemplate(){ return <SettingsEditor title="Collection Sheet SMS Template" prefix="sms.collectionSheets." fields={[{key:"template", label:"Template", type:"text"}]} />; }
