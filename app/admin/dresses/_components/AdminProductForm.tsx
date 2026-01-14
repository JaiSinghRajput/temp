"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { productsService } from "@/services/products/products.service";
import { DresscategoryService } from "@/services";
import { ProductImagesManager } from "../_components/ProductImagesManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const PRIMARY = "#e9ad99";

type Category = { id: number; name: string; slug: string; parent_id?: number | null };

export type AdminProductFormData = {
  product_code: string;
  vendor_code: string;
  sku: string;
  name: string;
  price: number;
  sale_price: number | null;
  is_active: number;
  category_ids: number[];
  metaData: any;
};

export function AdminProductForm({
  mode,
  productId,
  initial,
}: {
  mode: "create" | "edit";
  productId?: number | string;
  initial?: Partial<AdminProductFormData> & { slug?: string | null };
}) {
  const router = useRouter();

  const [saving, setSaving] = React.useState(false);

  // main and sub
  const [mainCategories, setMainCategories] = React.useState<Category[]>([]);
  const [subCategories, setSubCategories] = React.useState<Category[]>([]);

  const [selectedMainCategoryId, setSelectedMainCategoryId] = React.useState<number | null>(null);
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = React.useState<number[]>([]);

  // form
  const [form, setForm] = React.useState<AdminProductFormData>({
    product_code: "",
    vendor_code: "",
    sku: "",
    name: "",
    price: 0,
    sale_price: null,
    is_active: 1,
    category_ids: [],
    metaData: {},
  });

  const [metaJson, setMetaJson] = React.useState("{}");

  // ✅ load main categories
  React.useEffect(() => {
    (async () => {
      const res = await DresscategoryService.getDressCategories();
      setMainCategories(res.data ?? []);
    })();
  }, []);

  // ✅ load subcategories for selected main
  React.useEffect(() => {
    if (!selectedMainCategoryId) {
      setSubCategories([]);
      return;
    }
    (async () => {
      const res = await DresscategoryService.getDressSubcategories(selectedMainCategoryId);
      setSubCategories(res.data ?? []);
    })();
  }, [selectedMainCategoryId]);

  // ✅ sync initial values
  React.useEffect(() => {
    if (!initial) return;

    setForm({
      product_code: initial?.product_code ?? "",
      vendor_code: initial?.vendor_code ?? "",
      sku: initial?.sku ?? "",
      name: initial?.name ?? "",
      price: Number(initial?.price ?? 0),
      sale_price: initial?.sale_price ?? null,
      is_active: initial?.is_active ?? 1,
      category_ids: initial?.category_ids ?? [],
      metaData: initial?.metaData ?? {},
    });

    setMetaJson(JSON.stringify(initial?.metaData ?? {}, null, 2));

    // Prefill main/sub based on category_ids (simple strategy)
    const ids = initial?.category_ids ?? [];
    if (ids.length) {
      // assume first element is main category (your choice)
      setSelectedMainCategoryId(ids[0] ?? null);
      setSelectedSubCategoryIds(ids.slice(1));
    }
  }, [initial]);

  const selectMain = (id: number) => {
    setSelectedMainCategoryId(id);
    setSelectedSubCategoryIds([]); // reset subs on main change
  };

  const toggleSub = (id: number) => {
    setSelectedSubCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    let parsedMeta: any = {};
    try {
      parsedMeta = metaJson.trim() ? JSON.parse(metaJson) : {};
    } catch {
      alert("Invalid metaData JSON. Fix it.");
      return;
    }

    const category_ids = [
      ...(selectedMainCategoryId ? [selectedMainCategoryId] : []),
      ...selectedSubCategoryIds,
    ];

    setSaving(true);
    try {
      const payload = { ...form, metaData: parsedMeta, category_ids };

      if (mode === "create") {
        const res = await productsService.createProduct(payload as any);
        router.push(`/admin/products/${res.product_id}/edit`);
      } else {
        await productsService.updateProduct(String(productId), payload as any);
      }

      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      {/* LEFT */}
      <div className="space-y-4">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">
              {mode === "create" ? "Create Product" : "Edit Product"}
            </CardTitle>

            {initial?.slug ? (
              <p className="text-sm text-muted-foreground">
                Slug: <span className="font-mono">{initial.slug}</span>
              </p>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Product Code</Label>
                <Input value={form.product_code} onChange={(e) => setForm({ ...form, product_code: e.target.value })} className="rounded-xl" />
              </div>

              <div className="space-y-2">
                <Label>Vendor Code</Label>
                <Input value={form.vendor_code} onChange={(e) => setForm({ ...form, vendor_code: e.target.value })} className="rounded-xl" />
              </div>

              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="rounded-xl" />
              </div>

              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl" />
              </div>

              <div className="space-y-2">
                <Label>Price</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="rounded-xl" />
              </div>

              <div className="space-y-2">
                <Label>Sale Price</Label>
                <Input type="number" value={form.sale_price ?? ""} onChange={(e) => setForm({ ...form, sale_price: e.target.value ? Number(e.target.value) : null })} className="rounded-xl" />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="block">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive products won’t show to users.</p>
              </div>
              <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v ? 1 : 0 })} />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>metaData (JSON)</Label>
              <Textarea value={metaJson} onChange={(e) => setMetaJson(e.target.value)} className="min-h-60 rounded-xl font-mono text-xs" />
            </div>
          </CardContent>
        </Card>

        {/* ✅ Images seamless */}
        {mode === "edit" && productId ? (
          <ProductImagesManager productId={productId} />
        ) : (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Create product first, then upload images.
            </CardContent>
          </Card>
        )}
      </div>

      {/* RIGHT */}
      <Card className="rounded-2xl shadow-sm h-fit">
        <CardHeader>
          <CardTitle className="text-lg">Category</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose main category then subcategories.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* MAIN */}
          <div className="space-y-2">
            <Label>Main Categories</Label>
            <div className="flex flex-wrap gap-2">
              {mainCategories.map((cat) => {
                const selected = selectedMainCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => selectMain(cat.id)}
                    className="rounded-full border px-3 py-1 text-sm transition"
                    style={{
                      borderColor: selected ? PRIMARY : undefined,
                      backgroundColor: selected ? "rgba(233,173,153,0.22)" : undefined,
                    }}
                  >
                    <span className="font-medium">{cat.name}</span>{" "}
                    <span className="text-xs text-muted-foreground">@{cat.slug}</span>
                    {selected ? (
                      <Badge className="ml-2 rounded-full" style={{ backgroundColor: PRIMARY }}>
                        Selected
                      </Badge>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* SUB */}
          <div className="space-y-2">
            <Label>Subcategories</Label>

            {!selectedMainCategoryId ? (
              <p className="text-sm text-muted-foreground">Select a main category first.</p>
            ) : subCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subcategories for this category.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subCategories.map((sub) => {
                  const selected = selectedSubCategoryIds.includes(sub.id);
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => toggleSub(sub.id)}
                      className="rounded-full border px-3 py-1 text-sm transition"
                      style={{
                        borderColor: selected ? PRIMARY : undefined,
                        backgroundColor: selected ? "rgba(233,173,153,0.22)" : undefined,
                      }}
                    >
                      <span className="font-medium">{sub.name}</span>{" "}
                      <span className="text-xs text-muted-foreground">@{sub.slug}</span>
                      {selected ? (
                        <Badge className="ml-2 rounded-full" style={{ backgroundColor: PRIMARY }}>
                          Selected
                        </Badge>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* SAVE */}
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving} className="rounded-xl" style={{ backgroundColor: PRIMARY }}>
              {saving ? "Saving..." : mode === "create" ? "Create Product" : "Save Changes"}
            </Button>

            <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
