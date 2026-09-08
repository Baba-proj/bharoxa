import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { validatePropertyInput, PROPERTY_STATUSES, type PropertyStatus } from "@/lib/real-estate/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function propertyId(context: RouteContext) {
  return (await context.params).id;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { supabase, accountId } = await requireRole("viewer");
    const id = await propertyId(context);
    const { data, error } = await supabase
      .from("properties")
      .select("*, property_images(*)")
      .eq("id", id)
      .eq("account_id", accountId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Property not found" }, { status: 404 });
    return NextResponse.json({ property: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { supabase, accountId } = await requireRole("agent");
    const result = validatePropertyInput(await request.json().catch(() => null));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    const { data, error } = await supabase
      .from("properties")
      .update({ ...result.value, updated_at: new Date().toISOString() })
      .eq("id", await propertyId(context))
      .eq("account_id", accountId)
      .is("deleted_at", null)
      .select("*, property_images(*)")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Property not found or not owned by broker" }, { status: 404 });
    return NextResponse.json({ property: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { supabase, accountId } = await requireRole("agent");
    const body = await request.json().catch(() => null) as { status?: unknown } | null;
    if (!body || !PROPERTY_STATUSES.includes(body.status as PropertyStatus)) {
      return NextResponse.json({ error: "A valid status is required" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("properties")
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq("id", await propertyId(context))
      .eq("account_id", accountId)
      .is("deleted_at", null)
      .select()
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Property not found or not owned by broker" }, { status: 404 });
    return NextResponse.json({ property: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { supabase, accountId } = await requireRole("agent");
    const { data, error } = await supabase
      .from("properties")
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", await propertyId(context))
      .eq("account_id", accountId)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Property not found or not owned by broker" }, { status: 404 });
    return NextResponse.json({ deleted: true, id: data.id });
  } catch (error) {
    return toErrorResponse(error);
  }
}