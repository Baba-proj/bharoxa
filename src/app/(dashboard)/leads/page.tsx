"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2, Plus, UserRoundSearch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCan } from "@/hooks/use-can";

type Property = { id: string; property_name: string; city: string; locality: string };
type Followup = { id: string; property_id: string | null; due_at: string; note: string; completed_at: string | null };
type Lead = { id: string; customer_name: string; customer_mobile: string; source_channel: string; status: string; hotness: string; created_at: string; selected_property_ids: string[]; lead_followups: Followup[] };
const statuses = ["NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT", "NEGOTIATION", "INTERESTED", "CLOSED", "LOST"];

export default function LeadsPage() {
  const canEdit = useCan("send-messages");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ customer_name: "", customer_mobile: "", customer_email: "", notes: "", selected_property_ids: [] as string[] });

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/broker/leads");
    const body = await response.json();
    if (!response.ok) toast.error(body.error ?? "Could not load leads");
    setLeads(body.leads ?? []);
    setLoading(false);
  }, []);
  useEffect(() => {
    void loadLeads();
    void fetch("/api/broker/properties").then((response) => response.json()).then((body) => setProperties(body.properties ?? []));
  }, [loadLeads]);

  async function createLead(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/broker/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const body = await response.json();
    if (!response.ok) { toast.error(body.error ?? "Could not create lead"); return; }
    toast.success("Lead created");
    setForm({ customer_name: "", customer_mobile: "", customer_email: "", notes: "", selected_property_ids: [] });
    setFormOpen(false);
    await loadLeads();
  }

  async function updateStatus(lead: Lead, status: string) {
    const response = await fetch(`/api/broker/leads/${lead.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!response.ok) { toast.error("Could not update lead"); return; }
    await loadLeads();
  }

  const followups = leads.flatMap((lead) => lead.lead_followups.map((followup) => ({ ...followup, customer_name: lead.customer_name, customer_mobile: lead.customer_mobile })));

  return <div className="space-y-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold">Leads</h1><p className="mt-1 text-sm text-muted-foreground">Track enquiries, qualification, follow-ups, and closed deals.</p></div>{canEdit && <Button onClick={() => setFormOpen(!formOpen)}><Plus /> Add lead</Button>}</div>
    {formOpen && canEdit && <form onSubmit={createLead} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2"><h2 className="text-lg font-semibold sm:col-span-2">New lead</h2><Input required placeholder="Customer name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /><Input required placeholder="Mobile number" value={form.customer_mobile} onChange={(e) => setForm({ ...form, customer_mobile: e.target.value })} /><Input type="email" placeholder="Email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /><Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /><select multiple className="min-h-20 rounded-lg border border-input bg-background px-2 py-1 text-sm sm:col-span-2" value={form.selected_property_ids} onChange={(e) => setForm({ ...form, selected_property_ids: Array.from(e.target.selectedOptions, (option) => option.value) })}>{properties.map((property) => <option key={property.id} value={property.id}>{property.property_name} · {property.locality}, {property.city}</option>)}</select><p className="text-xs text-muted-foreground sm:col-span-2">Select the properties this customer is interested in. Move the lead to INTERESTED to create follow-ups automatically.</p><Button type="submit" className="sm:col-span-2">Save lead</Button></form>}
    <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full text-left text-sm"><thead className="border-b border-border text-muted-foreground"><tr><th className="p-3">Customer</th><th className="p-3">Source</th><th className="p-3">Hotness</th><th className="p-3">Status</th></tr></thead><tbody>{loading ? <tr><td colSpan={4} className="p-6 text-center"><Loader2 className="mx-auto animate-spin" /></td></tr> : leads.length === 0 ? <tr><td colSpan={4} className="p-10 text-center text-muted-foreground"><UserRoundSearch className="mx-auto mb-2" />No leads yet</td></tr> : leads.map((lead) => <tr key={lead.id} className="border-b border-border last:border-0"><td className="p-3"><div className="font-medium">{lead.customer_name}</div><div className="text-xs text-muted-foreground">{lead.customer_mobile}</div></td><td className="p-3">{lead.source_channel}</td><td className="p-3">{lead.hotness}</td><td className="p-3"><select disabled={!canEdit} className="rounded-lg border border-input bg-background px-2 py-1 text-xs" value={lead.status} onChange={(e) => void updateStatus(lead, e.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div>
    <section className="space-y-3"><div><h2 className="text-lg font-semibold">Follow-ups</h2><p className="text-sm text-muted-foreground">Property interest follow-ups are added here automatically.</p></div><div className="grid gap-3 md:grid-cols-2">{followups.length === 0 ? <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">No follow-ups yet. Attach a property to a lead and set its status to INTERESTED.</div> : followups.map((followup) => <div key={followup.id} className="rounded-xl border border-border bg-card p-4"><div className="flex items-start gap-3"><CalendarClock className="mt-0.5 h-5 w-5 text-primary" /><div><p className="font-medium">{followup.customer_name}</p><p className="text-sm text-muted-foreground">{followup.customer_mobile}</p><p className="mt-2 text-sm">{followup.note}</p><p className="mt-1 text-xs text-muted-foreground">Due {new Date(followup.due_at).toLocaleString()}</p></div></div></div>)}</div></section>
  </div>;
}