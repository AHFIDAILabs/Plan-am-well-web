"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Icon, ICONS } from "@/components/ui/Icon";
import { Product } from "@/lib/types";
import { realCategoryName } from "@/lib/product";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [dosage, setDosage] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ success: boolean; data?: Product; message?: string }>(`/api/products/${params.id}`).then(({ data }) => {
      if (data.success && data.data) {
        setProduct(data.data);
      } else {
        setError(data.message ?? "Could not load this product.");
      }
    });
  }, [params.id]);

  async function handleAddToCart() {
    if (!product) return;
    setAdding(true);
    setAddError(null);
    const { data } = await apiPost<{ success: boolean; message?: string }>("/api/cart", {
      items: [
        {
          drugId: product.drugId,
          quantity,
          dosage: dosage.trim() || undefined,
          specialInstructions: specialInstructions.trim() || undefined,
        },
      ],
    });
    setAdding(false);
    if (data.success) {
      setAdded(true);
    } else {
      setAddError(data.message ?? "Could not add this item to your cart.");
    }
  }

  if (error) {
    return (
      <div>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/app/pharmacy" className="mt-4 inline-block text-sm font-semibold text-primary">
          &larr; Back to products
        </Link>
      </div>
    );
  }

  if (!product) {
    return <p className="text-sm text-muted">Loading product...</p>;
  }

  const outOfStock = product.stockQuantity <= 0;

  return (
    <div>
      <Link href="/app/pharmacy" className="text-sm font-semibold text-primary">
        &larr; Back to products
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-card bg-card-bg shadow-atmospheric p-4">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} className="w-full rounded-lg object-cover" />
          ) : (
            <div className="flex h-64 w-full items-center justify-center rounded-lg bg-accent-pink-bg text-sm text-muted">
              No image available
            </div>
          )}
        </div>

        <div className="rounded-card bg-card-bg shadow-atmospheric p-6">
          {realCategoryName(product.categoryName) && (
            <p className="text-xs text-muted">{realCategoryName(product.categoryName)}</p>
          )}
          <h1 className="mt-1 text-xl font-black text-heading">{product.name}</h1>
          {product.manufacturerName && <p className="mt-1 text-sm text-muted">By {product.manufacturerName}</p>}
          <p className="mt-3 text-2xl font-bold text-heading">₦{product.price.toLocaleString()}</p>

          {product.prescriptionRequired && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent-amber-bg px-3 py-1 text-xs font-semibold text-accent-amber-fg">
              <Icon path={ICONS.alertCircle} className="h-3.5 w-3.5" /> Prescription required
            </span>
          )}

          {outOfStock ? (
            <p className="mt-4 text-sm font-semibold text-red-600">Out of stock</p>
          ) : (
            <div className="mt-5">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-heading">Quantity</label>
                <div className="flex items-center gap-3 rounded-full border border-border p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-heading transition-colors hover:bg-input-bg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <Icon path={ICONS.minus} className="h-4 w-4" />
                  </button>
                  <span className="w-4 text-center text-sm font-semibold text-heading">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                    disabled={quantity >= product.stockQuantity}
                    aria-label="Increase quantity"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-heading transition-colors hover:bg-input-bg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <Icon path={ICONS.add} className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {product.prescriptionRequired && (
                <div className="mt-4">
                  <label className="mb-1.5 block text-xs font-semibold text-heading">Dosage (optional)</label>
                  <input
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input-bg px-3.5 py-2.5 text-sm text-heading focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              <div className="mt-4">
                <Textarea
                  label="Special instructions (optional)"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={2}
                />
              </div>

              {addError && <p className="mt-3 text-sm text-red-600">{addError}</p>}

              <Button className="mt-5 w-full" loading={adding} onClick={handleAddToCart}>
                {added ? "Added to cart ✓" : "Add to cart"}
              </Button>
              {added && (
                <Link href="/app/cart" className="mt-2 block text-center text-xs font-semibold text-primary">
                  View cart &rarr;
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
