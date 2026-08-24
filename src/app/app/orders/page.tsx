"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { PharmacySubNav } from "@/components/pharmacy/PharmacySubNav";
import { GuestGate } from "@/components/auth/GuestGate";
import { PharmacyOrder } from "@/lib/types";

const PAYMENT_STYLES: Record<string, string> = {
  pending: "bg-accent-amber-bg text-accent-amber-fg",
  paid: "bg-green-100 text-green-700",
  failed: "bg-accent-pink-bg text-accent-pink-fg",
  refunded: "bg-accent-gray-bg text-accent-gray-fg",
};

export default function OrdersPage() {
  return (
    <GuestGate feature="Order History">
      <OrdersPageContent />
    </GuestGate>
  );
}

function OrdersPageContent() {
  const [orders, setOrders] = useState<PharmacyOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ success: boolean; data?: PharmacyOrder[]; message?: string }>("/api/orders").then(({ data }) => {
      if (data.success && data.data) {
        setOrders(data.data);
      } else {
        setError(data.message ?? "Could not load your orders.");
      }
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">Order History</h1>
      <PharmacySubNav />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!orders && !error && <p className="text-sm text-muted">Loading orders...</p>}
      {orders && orders.length === 0 && (
        <div className="rounded-card bg-card-bg shadow-atmospheric p-6 text-center">
          <p className="text-sm text-muted">You haven&apos;t placed any orders yet.</p>
          <Link href="/app/pharmacy" className="mt-2 inline-block text-sm font-semibold text-primary">
            Browse products &rarr;
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {orders?.map((order) => (
          <Link
            key={order._id}
            href={`/app/orders/${order._id}`}
            className="rounded-card bg-card-bg shadow-atmospheric p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-heading">Order #{order.orderNumber.slice(0, 8)}</p>
                <p className="text-xs text-muted">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  PAYMENT_STYLES[order.paymentStatus] ?? "bg-accent-gray-bg text-accent-gray-fg"
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted">{order.items.length} item(s)</span>
              <span className="font-bold text-heading">₦{order.total.toLocaleString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
