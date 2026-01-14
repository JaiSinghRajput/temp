"use client";

import * as React from "react";
import Link from "next/link";
import { productsService } from "@/services/products/products.service"; // <- your service path
import { Product } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const PRIMARY = "#e9ad99";

type ProductRow = Product & { primary_image?: string | null };

type ProductsListResponse = {
  success: boolean;
  page: number;
  limit: number;
  total?: number;
  data: ProductRow[];
};

export function AdminProductsList() {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<ProductRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(12);
  const [total, setTotal] = React.useState(0);

  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<"all" | "active" | "inactive">("all");

  const pages = Math.max(1, Math.ceil(total / limit));

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res: ProductsListResponse = await productsService.getAllProducts({
        page,
        limit,
        q: q.trim() || undefined,
        status: status !== "all" ? status : undefined,
      });

      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, status]);

  // ✅ Auto fetch on dependencies change
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);


  const onSearch = () => {
    setPage(1);
    fetchData();
  };

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-xl">Products</CardTitle>
          <p className="text-sm text-muted-foreground">Create, edit & manage physical products.</p>
        </div>

        <Button asChild className="rounded-xl" style={{ backgroundColor: PRIMARY }}>
          <Link href="/admin/dresses/add">+ New Product</Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2 w-full md:max-w-lg">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name / sku / slug..."
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
            />
            <Button variant="outline" className="rounded-xl" onClick={onSearch}>
              Search
            </Button>
          </div>

          <div className="flex gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="w-42.5 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="rounded-xl" onClick={fetchData}>
              Apply
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-18">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-35">Created</TableHead>
                <TableHead className="w-35 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-10 rounded-xl" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[320px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-25" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-22.5 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-30" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-9 w-22.5 ml-auto rounded-xl" /></TableCell>
                  </TableRow>
                ))
              ) : rows.length ? (
                rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="h-10 w-10 rounded-xl border bg-muted overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.primary_image ? (
                          <img src={p.primary_image} alt={p.name} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="line-clamp-1">{p.name}</span>
                        <span className="text-xs text-muted-foreground">
                          #{p.id} {p.sku ? `• ${p.sku}` : ""} {p.slug ? `• ${p.slug}` : ""}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <span>₹{Number(p.price).toLocaleString("en-IN")}</span>
                        {p.sale_price ? (
                          <span className="text-xs text-muted-foreground">
                            Sale ₹{Number(p.sale_price).toLocaleString("en-IN")}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell>
                      {p.is_active ? (
                        <Badge
                          className="rounded-full"
                          style={{ backgroundColor: "rgba(233,173,153,0.22)", color: "#7d3f2c" }}
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-full">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.created_at as any).toLocaleDateString()}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button asChild variant="outline" className="rounded-xl">
                        <Link href={`/admin/dresses/edit/${p.id}`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No products found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {pages} {total ? `• Total ${total}` : ""}
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
