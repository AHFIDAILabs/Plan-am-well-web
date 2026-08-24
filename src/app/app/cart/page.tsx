"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPut, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { PharmacySubNav } from "@/components/pharmacy/PharmacySubNav";
import { Cart } from "@/lib/types";

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function load() {
    apiGet<{ success: boolean; data?: Cart; localCart?: Cart; message?: string }>("/api/cart").then(({ data }) => {
      if (data.success) {
        setCart(data.data ?? data.localCart ?? { items: [], totalItems: 0, totalPrice: 0 });
      } else {
        // A 404 from the backend just means "no cart yet" — treat as empty,
        // not an error, so a brand-new user doesn't see a scary message.
        setCart({ items: [], totalItems: 0, totalPrice: 0 });
        setError(null);
      }
    });
  }

  useEffect(load, []);

  async function updateQuantity(drugId: string, quantity: number) {
    if (quantity < 1) return;
    setUpdatingId(drugId);
    await apiPut("/api/cart", { drugId, quantity });
    setUpdatingId(null);
    load();
  }

  async function removeItem(drugId: string) {
    setUpdatingId(drugId);
    await apiDelete("/api/cart/item", { drugId });
    setUpdatingId(null);
    load();
  }

  if (!cart) {
    return <p className="text-sm text-muted">Loading cart...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">My Cart</h1>
      <PharmacySubNav />

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {cart.items.length === 0 ? (
        <div className="rounded-card bg-card-bg shadow-atmospheric p-6 text-center">
          <p className="text-sm text-muted">Your cart is empty.</p>
          <Link href="/app/pharmacy" className="mt-2 inline-block text-sm font-semibold text-primary">
            Browse products &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-3 lg:col-span-2">
            {cart.items.map((item) => (
              <div key={item.drugId} className="flex items-center gap-3 rounded-card bg-card-bg shadow-atmospheric p-3">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.drugName ?? "Product"} className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-accent-pink-bg" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-heading">{item.drugName ?? item.drugId}</p>
                  <p className="text-xs text-muted">₦{(item.price ?? 0).toLocaleString()} each</p>
                  {item.dosage && <p className="text-xs text-muted">Dosage: {item.dosage}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={updatingId === item.drugId}
                    onClick={() => updateQuantity(item.drugId, item.quantity - 1)}
                    className="h-7 w-7 rounded-lg border border-border text-heading hover:border-primary disabled:opacity-40"
                  >
                    &minus;
                  </button>
                  <span className="w-6 text-center text-sm font-semibold text-heading">{item.quantity}</span>
                  <button
                    disabled={updatingId === item.drugId}
                    onClick={() => updateQuantity(item.drugId, item.quantity + 1)}
                    className="h-7 w-7 rounded-lg border border-border text-heading hover:border-primary disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
                <p className="w-20 shrink-0 text-right text-sm font-bold text-heading">
                  ₦{((item.price ?? 0) * item.quantity).toLocaleString()}
                </p>
                <button
                  disabled={updatingId === item.drugId}
                  onClick={() => removeItem(item.drugId)}
                  className="shrink-0 text-xs font-semibold text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-card bg-card-bg shadow-atmospheric p-5">
            <h2 className="font-bold text-heading">Order summary</h2>
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-muted">Items ({cart.totalItems})</span>
              <span className="text-heading">₦{cart.totalPrice.toLocaleString()}</span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>Delivery fee</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="mt-4 border-t border-border pt-3">
              <Link href="/app/checkout">
                <Button className="w-full">Proceed to checkout</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
