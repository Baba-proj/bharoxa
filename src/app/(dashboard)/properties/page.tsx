"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, ImagePlus, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCan } from "@/hooks/use-can";
import { createClient } from "@/lib/supabase/client";
import { VASTU_DIRECTIONS } from "@/lib/real-estate/validation";

type Property = {
  id: string;
  property_name: string;
  property_type: string;
  transaction_type: string;
  city: string;
  locality: string;
  price: number;
  currency: string;
  status: string;
  bedrooms: number | null;
  area: number | null;
  vastu_direction: string | null;
  property_images?: { id: string; public_url: string | null }[];
};

const emptyForm = {
  property_name: "",
  property_type: "Apartment",
  transaction_type: "SALE",
  city: "",
  locality: "",
  price: "",
  currency: "INR",
  status: "ACTIVE",
  bedrooms: "",
  area: "",
  description: "",
  vastu_direction: "",
};

export default function PropertiesPage() {
  const canEdit = useCan("send-messages");
  const supabase = createClient();
  const [properties, setProperties] = useState<Property[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const loadProperties = useCallback(async () => {
    setLoading(true);
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const response = await fetch(`/api/broker/properties${query}`);
    const body = await response.json();
    if (!response.ok) toast.error(body.error ?? "Could not load properties");
    setProperties(body.properties ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProperties(), 250);
    return () => window.clearTimeout(timer);
  }, [loadProperties]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setImageFiles([]);
    setImagePreviews([]);
    setFormOpen(true);
  }

  function openEdit(property: Property) {
    setEditingId(property.id);
    setForm({
      ...emptyForm,
      property_name: property.property_name,
      property_type: property.property_type,
      transaction_type: property.transaction_type,
      city: property.city,
      locality: property.locality,
      price: String(property.price),
      currency: property.currency,
      status: property.status,
      bedrooms: property.bedrooms == null ? "" : String(property.bedrooms),
      area: property.area == null ? "" : String(property.area),
      vastu_direction: property.vastu_direction ?? "",
    });
    setImageFiles([]);
    setImagePreviews(property.property_images?.map((image) => image.public_url).filter((url): url is string => Boolean(url)) ?? []);
    setFormOpen(true);
  }

  function selectImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024);
    if (files.length !== (event.target.files?.length ?? 0)) toast.error("Only images up to 5 MB can be uploaded");
    setImageFiles((current) => [...current, ...files].slice(0, 10));
    setImagePreviews((current) => [...current, ...files.map((file) => URL.createObjectURL(file))].slice(0, 10));
    event.target.value = "";
  }

  function removeImage(index: number) {
    setImageFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setImagePreviews((current) => current.filter((_, previewIndex) => previewIndex !== index));
  }

  async function saveProperty(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      price: Number(form.price),
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      area: form.area ? Number(form.area) : null,
    };
    const response = await fetch(editingId ? `/api/broker/properties/${editingId}` : "/api/broker/properties", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    setSaving(false);
    if (!response.ok) {
      toast.error(body.error ?? "Could not save property");
      return;
    }
    const property = body.property as Property;
    if (imageFiles.length > 0) {
      for (const [index, file] of imageFiles.entries()) {
        const path = `${property.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const upload = await supabase.storage.from("property-images").upload(path, file, { contentType: file.type, upsert: false });
        if (upload.error) {
          toast.error(`Could not upload ${file.name}`);
          continue;
        }
        const { data: publicData } = supabase.storage.from("property-images").getPublicUrl(path);
        await supabase.from("property_images").insert({ property_id: property.id, storage_key: path, public_url: publicData.publicUrl, sort_order: index });
      }
    }
    toast.success(editingId ? "Property updated" : "Property added");
    setFormOpen(false);
    await loadProperties();
  }

  async function deleteProperty(id: string) {
    if (!window.confirm("Delete this property?")) return;
    const response = await fetch(`/api/broker/properties/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json();
      toast.error(body.error ?? "Could not delete property");
      return;
    }
    toast.success("Property deleted");
    await loadProperties();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your real-estate listings and availability.</p>
        </div>
        {canEdit && <Button onClick={openCreate}><Plus /> Add property</Button>}
      </div>

      <div className="flex max-w-md items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, city, type, or ID" />
      </div>

      {formOpen && canEdit && (
        <form onSubmit={saveProperty} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <h2 className="text-lg font-semibold sm:col-span-2 lg:col-span-4">{editingId ? "Edit property" : "Add property"}</h2>
          <Input required placeholder="Property name" value={form.property_name} onChange={(e) => setForm({ ...form, property_name: e.target.value })} />
          <Input required placeholder="Property type" value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })} />
          <Input required placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input required placeholder="Locality" value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} />
          <Input required type="number" min="0" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <Input type="number" min="0" placeholder="Bedrooms" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
          <Input type="number" min="0" placeholder="Area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          <select className="h-8 rounded-lg border border-input bg-background px-2 text-sm" value={form.transaction_type} onChange={(e) => setForm({ ...form, transaction_type: e.target.value })}><option value="SALE">Sale</option><option value="RENT">Rent</option></select>
          <select className="h-8 rounded-lg border border-input bg-background px-2 text-sm" value={form.vastu_direction} onChange={(e) => setForm({ ...form, vastu_direction: e.target.value })}><option value="">Vastu facing direction</option>{VASTU_DIRECTIONS.map((direction) => <option key={direction} value={direction}>{direction.replace("NORTH", "North ").replace("SOUTH", "South ").replace("EAST", "East").replace("WEST", "West").trim()}</option>)}</select>
          <textarea className="min-h-20 rounded-lg border border-input bg-background px-3 py-2 text-sm sm:col-span-2 lg:col-span-4" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="space-y-2 sm:col-span-2 lg:col-span-4"><label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"><ImagePlus className="h-4 w-4" /> Add property images<input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={selectImages} /></label><div className="flex flex-wrap gap-2">{imagePreviews.map((preview, index) => <div key={`${preview}-${index}`} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border"><img src={preview} alt="Property preview" className="h-full w-full object-cover" /><button type="button" aria-label="Remove image" className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white" onClick={() => removeImage(index)}><X className="h-3 w-3" /></button></div>)}</div></div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4"><Button type="submit" disabled={saving}>{saving && <Loader2 className="animate-spin" />} Save property</Button><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button></div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm"><thead className="border-b border-border text-muted-foreground"><tr><th className="p-3">Property</th><th className="p-3">Location</th><th className="p-3">Price</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody>
          {loading ? <tr><td className="p-6 text-center" colSpan={5}><Loader2 className="mx-auto animate-spin" /></td></tr> : properties.length === 0 ? <tr><td className="p-10 text-center text-muted-foreground" colSpan={5}><Building2 className="mx-auto mb-2" />No properties yet</td></tr> : properties.map((property) => <tr key={property.id} className="border-b border-border last:border-0"><td className="p-3"><div className="font-medium">{property.property_name}</div><div className="text-xs text-muted-foreground">{property.property_type} · {property.transaction_type}</div></td><td className="p-3">{property.locality}, {property.city}</td><td className="p-3">{property.currency} {Number(property.price).toLocaleString()}</td><td className="p-3"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{property.status}</span></td><td className="p-3"><div className="flex gap-1">{canEdit && <><Button variant="ghost" size="icon" aria-label="Edit property" onClick={() => openEdit(property)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label="Delete property" onClick={() => void deleteProperty(property.id)}><Trash2 /></Button></>}</div></td></tr>)}
        </tbody></table>
      </div>
    </div>
  );
}