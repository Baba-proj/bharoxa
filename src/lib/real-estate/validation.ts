export const PROPERTY_STATUSES = ["DRAFT", "ACTIVE", "SOLD", "INACTIVE"] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const VASTU_DIRECTIONS = [
  "EAST",
  "WEST",
  "NORTH",
  "SOUTH",
  "NORTHEAST",
  "NORTHWEST",
  "SOUTHEAST",
  "SOUTHWEST",
] as const;
export type VastuDirection = (typeof VASTU_DIRECTIONS)[number];

export interface PropertyInput {
  property_name: string;
  property_type: string;
  transaction_type?: string;
  city: string;
  locality: string;
  price: number;
  currency?: string;
  vastu_direction?: VastuDirection | null;
  description?: string | null;
  status?: PropertyStatus;
  bedrooms?: number | null;
  area?: number | null;
  furnishing?: string | null;
}

export function validatePropertyInput(body: unknown):
  | { ok: true; value: PropertyInput }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid JSON" };
  const input = body as Record<string, unknown>;
  const required = ["property_name", "property_type", "city", "locality"];
  for (const field of required) {
    if (typeof input[field] !== "string" || !input[field].trim()) {
      return { ok: false, error: `${field} is required` };
    }
  }
  if (typeof input.price !== "number" || !Number.isFinite(input.price) || input.price < 0) {
    return { ok: false, error: "price must be a non-negative number" };
  }
  if (input.status !== undefined && !PROPERTY_STATUSES.includes(input.status as PropertyStatus)) {
    return { ok: false, error: "Invalid property status" };
  }
  if (input.vastu_direction !== undefined && input.vastu_direction !== null && input.vastu_direction !== "" && !VASTU_DIRECTIONS.includes(input.vastu_direction as VastuDirection)) {
    return { ok: false, error: "Invalid Vastu direction" };
  }
  return {
    ok: true,
    value: {
      property_name: (input.property_name as string).trim(),
      property_type: (input.property_type as string).trim(),
      transaction_type: typeof input.transaction_type === "string" ? input.transaction_type : "SALE",
      city: (input.city as string).trim(),
      locality: (input.locality as string).trim(),
      price: input.price,
      currency: typeof input.currency === "string" ? input.currency : "INR",
      vastu_direction: typeof input.vastu_direction === "string" && input.vastu_direction ? input.vastu_direction as VastuDirection : null,
      description: typeof input.description === "string" ? input.description : null,
      status: (input.status as PropertyStatus | undefined) ?? "ACTIVE",
      bedrooms: typeof input.bedrooms === "number" ? input.bedrooms : null,
      area: typeof input.area === "number" ? input.area : null,
      furnishing: typeof input.furnishing === "string" ? input.furnishing : null,
    },
  };
}