import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";

const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT", "NEGOTIATION", "INTERESTED", "CLOSED", "LOST"] as const;
const HOTNESS = ["COLD", "WARM", "HOT"] as const;

export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireRole("viewer");
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    let query = supabase
      .from("leads")
      .select("*, lead_followups(*)", { count: "exact" })
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });
    if (status && LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) query = query.eq("status", status);
    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ leads: data ?? [], total: count ?? 0 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole("agent");
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const customerName = typeof body?.customer_name === "string" ? body.customer_name.trim() : "";
    const customerMobile = typeof body?.customer_mobile === "string" ? body.customer_mobile.trim() : "";
    if (!customerName || !customerMobile) return NextResponse.json({ error: "customer_name and customer_mobile are required" }, { status: 400 });
    const status = typeof body?.status === "string" && LEAD_STATUSES.includes(body.status as (typeof LEAD_STATUSES)[number]) ? body.status : "NEW";
    const hotness = typeof body?.hotness === "string" && HOTNESS.includes(body.hotness as (typeof HOTNESS)[number]) ? body.hotness : "WARM";
    const { data, error } = await supabase
      .from("leads")
      .insert({
        account_id: accountId,
        broker_id: userId,
        customer_name: customerName,
        customer_mobile: customerMobile,
        customer_email: typeof body?.customer_email === "string" ? body.customer_email.trim() : null,
        requirements: body?.requirements && typeof body.requirements === "object" ? body.requirements : {},
        source_channel: typeof body?.source_channel === "string" ? body.source_channel : "MANUAL",
        status,
        hotness,
        notes: typeof body?.notes === "string" ? body.notes : null,
        selected_property_ids: Array.isArray(body?.selected_property_ids) ? body.selected_property_ids : [],
      })
      .select("*, lead_followups(*)")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ lead: data }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}