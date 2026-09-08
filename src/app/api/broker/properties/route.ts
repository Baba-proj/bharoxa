import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { validatePropertyInput } from "@/lib/real-estate/validation";

export async function GET(request: Request) {
  try {
    const { supabase, accountId } = await requireRole("viewer");
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("page_size") ?? "25") || 25));
    const search = url.searchParams.get("search")?.trim();
    let query = supabase
      .from("properties")
      .select("*, property_images(*)", { count: "exact" })
      .eq("account_id", accountId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (search) query = query.or(`property_name.ilike.%${search}%,city.ilike.%${search}%,property_type.ilike.%${search}%,id.eq.${search}`);
    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ properties: data ?? [], page, page_size: pageSize, total: count ?? 0 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole("agent");
    const result = validatePropertyInput(await request.json().catch(() => null));
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    const { data, error } = await supabase
      .from("properties")
      .insert({ ...result.value, account_id: accountId, broker_id: userId })
      .select("*, property_images(*)")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ property: data }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}