"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PharmacySubNav } from "@/components/pharmacy/PharmacySubNav";
import { ProductCard } from "@/components/pharmacy/ProductCard";
import { Product } from "@/lib/types";
import { realCategoryName } from "@/lib/product";

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
    return Array.from(new Set(products.map((p) => realCategoryName(p.categoryName)).filter((c): c is string => !!c))).sort();
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = category === "all" || realCategoryName(p.categoryName) === category;
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || realCategoryName(p.categoryName)?.toLowerCase().includes(q);
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
        {filtered.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            adding={addingId === product._id}
            added={addedId === product._id}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>
    </div>
  );
}
