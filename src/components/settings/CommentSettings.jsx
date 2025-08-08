import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-toastify';

const Row = ({ title, desc, control }) => (
  <div className="flex items-center justify-between border rounded-xl p-3">
    <div>
      <p className="font-medium">{title}</p>
      {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
    </div>
    {control}
  </div>
);

const Section = ({ title, subtitle, children }) => (
  <Card>
    <CardContent className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="grid md:grid-cols-2 gap-4">{children}</div>
    </CardContent>
  </Card>
);

const CommentSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    enabled: true,

    // Posting rules
    requireAuth: true,
    allowMentions: true,
    allowAttachments: true,
    maxAttachmentMb: 5,
    allowedAttachmentTypes: 'pdf,jpg,png',
    maxLength: 1000,

    // Moderation
    moderationMode: 'auto', // none|pre|post|auto
    profanityFilter: true,
    blockedWords: 'scam,fraud,abuse',
    spamThreshold: 0.85, // 0..1 (only used when moderation=auto)
    allowEditsMinutes: 10,
    allowDeletes: true,

    // Visibility / Contexts
    contextsEnabled: ['loan', 'borrower', 'saving'], // which entities support comments
    defaultVisibility: 'internal', // internal|public_to_borrower
    allowPublicToBorrower: true,

    // Notifications
    notifyOnMention: true,
    notifyOnReply: true,
    notifyViaEmail: true,
    notifyViaSMS: false,

    // Templates / Quick replies
    quickReplies: 'Noted, We will review, Thank you',

    // Retention
    retentionDays: 0, // 0 = keep forever
  });

  const setVal = (k) => (v) => setSettings((s) => ({ ...s, [k]: v }));
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setSettings((s) => ({ ...s, [name]: type === 'number' ? Number(value) : value }));
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/settings/comments');
      if (data) setSettings((s) => ({ ...s, ...data }));
    } catch {
      toast.error('Failed to load comment settings');
    } finally {
      setLoading(false);
    }
  };

  const save = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      await axios.put('/api/settings/comments', settings);
      toast.success('Comment settings saved');
    } catch {
      toast.error('Failed to save comment settings');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Comment Settings</h2>
            <p className="text-sm text-muted-foreground">Posting rules, moderation, visibility, and notifications.</p>
          </div>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save All'}
          </Button>
        </CardContent>
      </Card>

      {/* Posting Rules */}
      <Section title="Posting Rules" subtitle="Who can post and what they can include.">
        <Row title="Enable Comments" control={<Switch checked={!!settings.enabled} onCheckedChange={setVal('enabled')} />} />
        <Row title="Require Authenticated Users" control={<Switch checked={!!settings.requireAuth} onCheckedChange={setVal('requireAuth')} />} />
        <Row title="Allow @Mentions" control={<Switch checked={!!settings.allowMentions} onCheckedChange={setVal('allowMentions')} />} />
        <Row title="Allow Attachments" control={<Switch checked={!!settings.allowAttachments} onCheckedChange={setVal('allowAttachments')} />} />
        <div className={`${settings.allowAttachments ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
          <Label>Max Attachment Size (MB)</Label>
          <Input type="number" min="1" name="maxAttachmentMb" value={settings.maxAttachmentMb ?? 5} onChange={handleChange} />
        </div>
        <div className={`${settings.allowAttachments ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
          <Label>Allowed Types (comma-separated)</Label>
          <Input name="allowedAttachmentTypes" value={settings.allowedAttachmentTypes || ''} onChange={handleChange} placeholder="pdf,jpg,png" />
        </div>
        <div className="space-y-2">
          <Label>Max Comment Length</Label>
          <Input type="number" min="100" name="maxLength" value={settings.maxLength ?? 1000} onChange={handleChange} />
        </div>
      </Section>

      {/* Moderation */}
      <Section title="Moderation" subtitle="Keep conversations clean and useful.">
        <div className="space-y-2">
          <Label>Moderation Mode</Label>
          <Select value={settings.moderationMode} onValueChange={setVal('moderationMode')}>
            <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (no review)</SelectItem>
              <SelectItem value="pre">Pre-moderation (review before visible)</SelectItem>
              <SelectItem value="post">Post-moderation (flag after posting)</SelectItem>
              <SelectItem value="auto">Auto (spam/profanity model + flags)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Row title="Profanity Filter" control={<Switch checked={!!settings.profanityFilter} onCheckedChange={setVal('profanityFilter')} />} />
        <div className="space-y-2">
          <Label>Blocked Words (comma-separated)</Label>
          <Textarea name="blockedWords" rows={2} value={settings.blockedWords || ''} onChange={handleChange} />
        </div>
        <div className={`${settings.moderationMode === 'auto' ? '' : 'opacity-60 pointer-events-none'} space-y-2`}>
          <Label>Spam Threshold (0–1)</Label>
          <Input type="number" min="0" max="1" step="0.01" name="spamThreshold" value={settings.spamThreshold ?? 0.85} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Allow Edits (minutes after posting)</Label>
          <Input type="number" min="0" name="allowEditsMinutes" value={settings.allowEditsMinutes ?? 0} onChange={handleChange} />
        </div>
        <Row title="Allow Deletions" control={<Switch checked={!!settings.allowDeletes} onCheckedChange={setVal('allowDeletes')} />} />
      </Section>

      {/* Visibility & Contexts */}
      <Section title="Visibility & Contexts" subtitle="Where comments appear and who sees them.">
        <div className="space-y-2">
          <Label>Supported Contexts</Label>
          <Select
            value={settings.contextsEnabled?.[0] || 'loan'}
            onValueChange={(v) => setVal('contextsEnabled')([v])}
          >
            <SelectTrigger><SelectValue placeholder="Select context" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="loan">Loan</SelectItem>
              <SelectItem value="borrower">Borrower</SelectItem>
              <SelectItem value="saving">Saving Account</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Multiple contexts supported; UI selects one for now.</p>
        </div>
        <div className="space-y-2">
          <Label>Default Visibility</Label>
          <Select value={settings.defaultVisibility} onValueChange={setVal('defaultVisibility')}>
            <SelectTrigger><SelectValue placeholder="Select visibility" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">Internal (staff only)</SelectItem>
              <SelectItem value="public_to_borrower">Visible to Borrower</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Row
          title="Allow 'Visible to Borrower'"
          desc="Users can mark selected comments visible to the borrower"
          control={<Switch checked={!!settings.allowPublicToBorrower} onCheckedChange={setVal('allowPublicToBorrower')} />}
        />
      </Section>

      {/* Notifications */}
      <Section title="Notifications" subtitle="Alert participants and mentioned users.">
        <Row title="Notify on @Mention" control={<Switch checked={!!settings.notifyOnMention} onCheckedChange={setVal('notifyOnMention')} />} />
        <Row title="Notify on Reply" control={<Switch checked={!!settings.notifyOnReply} onCheckedChange={setVal('notifyOnReply')} />} />
        <Row title="Notify via Email" control={<Switch checked={!!settings.notifyViaEmail} onCheckedChange={setVal('notifyViaEmail')} />} />
        <Row title="Notify via SMS" control={<Switch checked={!!settings.notifyViaSMS} onCheckedChange={setVal('notifyViaSMS')} />} />
        <div className="space-y-2 md:col-span-2">
          <Label>Quick Replies (comma-separated)</Label>
          <Input name="quickReplies" value={settings.quickReplies || ''} onChange={handleChange} placeholder="Noted, We will review, Thank you" />
        </div>
      </Section>

      {/* Retention */}
      <Section title="Retention" subtitle="How long to keep comment history.">
        <div className="space-y-2">
          <Label>Retention Days (0 = keep forever)</Label>
          <Input type="number" min="0" name="retentionDays" value={settings.retentionDays ?? 0} onChange={handleChange} />
        </div>
      </Section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || loading}>
          {saving ? 'Saving…' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
};

export default CommentSettings;
