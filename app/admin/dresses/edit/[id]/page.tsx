"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { productsService } from "@/services/products/products.service";
import { AdminProductForm } from "../../_components/AdminProductForm";

export default function EditProductPage() {
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = React.useState(true);
  const [initial, setInitial] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await productsService.getProductById(id);

        if (!res?.success) {
          setError("Product not found");
          setInitial(null);
        } else {
          setInitial(res.data);
        }
      } catch (e: any) {
        setError(e?.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Loading product...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border p-6 text-center">
          <h2 className="text-lg font-semibold">Error</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <AdminProductForm mode="edit" productId={id} initial={initial} />
    </div>
  );
}
