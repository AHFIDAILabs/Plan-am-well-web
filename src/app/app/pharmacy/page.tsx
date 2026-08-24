"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { PharmacySubNav } from "@/components/pharmacy/PharmacySubNav";
import { Product } from "@/lib/types";

export default function PharmacyPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ success: boolean; data?: Product[]; message?: string }>("/api/products?limit=100").then(({ data }) => {
      if (data.success && data.data) {
        setProducts(data.data);
      } else {
        setError(data.message ?? "Could not load products.");
      }
    });
  }, []);

  const categories = useMemo(() => {
    if (!products) return [];
    return Array.from(new Set(products.map((p) => p.categoryName).filter((c): c is string => !!c))).sort();
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = category === "all" || p.categoryName === category;
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.categoryName?.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [products, search, category]);

  async function handleAddToCart(product: Product) {
    setAddingId(product._id);
    setAddedId(null);
    const { data } = await apiPost<{ success: boolean; message?: string }>("/api/cart", {
      items: [{ drugId: product.drugId, quantity: 1 }],
    });
    setAddingId(null);
    if (data.success) {
      setAddedId(product._id);
    } else {
      setError(data.message ?? "Could not add this item to your cart.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">Order Products</h1>
      <p className="mt-1 text-sm text-muted">Browse and order reproductive health products, delivered discreetly.</p>

      <PharmacySubNav />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Input placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-56">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!products && !error && <p className="mt-6 text-sm text-muted">Loading products...</p>}
      {products && filtered.length === 0 && <p className="mt-6 text-sm text-muted">No products found.</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((product) => {
          const outOfStock = product.stockQuantity <= 0;
          return (
            <div key={product._id} className="rounded-card bg-card-bg shadow-atmospheric">
              <Link href={`/app/pharmacy/${product._id}`}>
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt={product.name} className="h-32 w-full rounded-t-xl object-cover" />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center rounded-t-xl bg-accent-pink-bg text-xs text-muted">
                    No image
                  </div>
                )}
              </Link>
              <div className="p-3">
                <Link href={`/app/pharmacy/${product._id}`}>
                  <p className="truncate text-sm font-semibold text-heading">{product.name}</p>
                </Link>
                <p className="text-xs text-muted">{product.categoryName}</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="font-bold text-heading">₦{product.price.toLocaleString()}</p>
                  {product.prescriptionRequired && (
                    <span className="rounded-full bg-accent-amber-bg px-2 py-0.5 text-[10px] font-semibold text-accent-amber-fg">
                      Rx
                    </span>
                  )}
                </div>
                {outOfStock ? (
                  <p className="mt-2 text-xs font-semibold text-red-600">Out of stock</p>
                ) : (
                  <Button
                    className="mt-2 w-full"
                    loading={addingId === product._id}
                    onClick={() => handleAddToCart(product)}
                  >
                    {addedId === product._id ? "Added ✓" : "Add to cart"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
