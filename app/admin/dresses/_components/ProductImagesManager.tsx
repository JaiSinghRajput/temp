"use client";

import * as React from "react";
import { uploadService } from "@/services/upload.service";
import { productImagesService, ProductImage } from "@/services";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PRIMARY = "#e9ad99";

export function ProductImagesManager({
    productId,
}: {
    productId: number | string;
}) {
    const [images, setImages] = React.useState<ProductImage[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [uploading, setUploading] = React.useState(false);
    const fileRef = React.useRef<HTMLInputElement | null>(null);
    const fetchImages = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await productImagesService.getImages(productId);
            setImages(res.data ?? []);
        } finally {
            setLoading(false);
        }
    }, [productId]);

    React.useEffect(() => {
        fetchImages();
    }, [fetchImages]);

    const uploadFiles = async (files: File[]) => {
        // upload one by one (safe & easy)
        const uploaded: Array<{ url: string; public_id?: string | null }> = [];

        for (const file of files) {
            const fd = new FormData();
            fd.append("file", file);

            // folder = products/<productId>
            const cloud = await uploadService.uploadToCloudinary(fd, `products/${productId}`);

            // ⚠️ Adjust keys if your API returns different field names
            // Expected: cloud.url OR cloud.secure_url
            const url = cloud?.url || cloud?.secure_url;
            const public_id = cloud?.public_id;

            if (!url) throw new Error("Cloudinary upload response missing url");

            uploaded.push({ url, public_id });
        }

        return uploaded;
    };

    const onPickFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const uploaded = await uploadFiles(Array.from(files));

            for (const img of uploaded) {
                await productImagesService.addImage({
                    product_id: productId,
                    image_url: img.url,
                    cloudinary_public_id: img.public_id ?? null,
                    is_primary: false,
                    sort_order: 0,
                });
            }

            await fetchImages();
        } catch (e: any) {
            alert(e?.message || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const setPrimary = async (img: ProductImage) => {
        await productImagesService.updateImage({
            id: img.id,
            product_id: productId,
            is_primary: true,
        });
        await fetchImages();
    };

    const remove = async (img: ProductImage) => {
        const ok = confirm("Delete this image?");
        if (!ok) return;

        // 1) delete DB record
        await productImagesService.deleteImage(img.id);

        // 2) delete from Cloudinary
        if (img.cloudinary_public_id) {
            try {
                await uploadService.deleteFromCloudinary(img.cloudinary_public_id, `products/${productId}`);
            } catch {
                // don't block UI if cloud delete fails
                console.warn("Cloudinary delete failed");
            }
        }

        await fetchImages();
    };

    return (
        <Card className="rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                    <CardTitle className="text-lg">Product Images</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Upload multiple images and set one as primary.
                    </p>
                </div>

                <Button
                    type="button"
                    className="rounded-xl"
                    style={{ backgroundColor: PRIMARY }}
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                >
                    {uploading ? "Uploading..." : "+ Upload"}
                </Button>

                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => onPickFiles(e.target.files)}
                />
            </CardHeader>

            <CardContent>
                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading images...</p>
                ) : images.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No images uploaded yet.</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {images.map((img) => (
                            <div key={img.id} className="rounded-2xl border overflow-hidden">
                                <div className="relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={img.image_url}
                                        alt=""
                                        className="h-40 w-full object-cover"
                                    />

                                    {img.is_primary ? (
                                        <Badge
                                            className="absolute top-2 left-2 rounded-full"
                                            style={{ backgroundColor: PRIMARY }}
                                        >
                                            Primary
                                        </Badge>
                                    ) : null}
                                </div>

                                <div className="p-2 flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="rounded-xl w-full"
                                        disabled={img.is_primary === 1}
                                        onClick={() => setPrimary(img)}
                                    >
                                        Set Primary
                                    </Button>

                                    <Button
                                        variant="destructive"
                                        className="rounded-xl"
                                        onClick={() => remove(img)}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
