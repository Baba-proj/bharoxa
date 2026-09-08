import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT", "NEGOTIATION", "INTERESTED", "CLOSED", "LOST"] as const;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, accountId } = await requireRole("viewer");
    const { id } = await context.params;
    const { data, error } = await supabase.from("leads").select("*, lead_followups(*)").eq("id", id).eq("account_id", accountId).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json({ lead: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, accountId } = await requireRole("agent");
    const { id } = await context.params;
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (typeof body?.status !== "string" || !STATUSES.includes(body.status as (typeof STATUSES)[number])) return NextResponse.json({ error: "A valid status is required" }, { status: 400 });
    const { data, error } = await supabase.from("leads").update({ status: body.status, updated_at: new Date().toISOString(), closed_at: body.status === "CLOSED" ? new Date().toISOString() : null }).eq("id", id).eq("account_id", accountId).select("*, lead_followups(*)").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Lead not found or not owned by broker" }, { status: 404 });
    if (body.status === "INTERESTED" && data.selected_property_ids?.length) {
      const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await supabase.from("lead_followups").upsert(
        data.selected_property_ids.map((propertyId: string) => ({
          lead_id: data.id,
          account_id: data.account_id,
          broker_id: data.broker_id,
          property_id: propertyId,
          due_at: dueAt,
          note: `Follow up with ${data.customer_name} about property interest`,
        })),
        { onConflict: "lead_id,property_id" },
      );
    }
    const { data: refreshed } = await supabase.from("leads").select("*, lead_followups(*)").eq("id", id).eq("account_id", accountId).single();
    return NextResponse.json({ lead: refreshed ?? data });
  } catch (error) {
    return toErrorResponse(error);
  }
}