"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { GuestGate } from "@/components/auth/GuestGate";
import { PharmacyOrder } from "@/lib/types";

const POLL_INTERVAL_MS = 4000;

const PAYMENT_COPY: Record<PharmacyOrder["paymentStatus"], { label: string; className: string }> = {
  pending: { label: "Payment pending", className: "bg-accent-amber-bg text-accent-amber-fg" },
  paid: { label: "Payment successful", className: "bg-green-100 text-green-700" },
  failed: { label: "Payment failed", className: "bg-accent-pink-bg text-accent-pink-fg" },
  refunded: { label: "Refunded", className: "bg-accent-gray-bg text-accent-gray-fg" },
};

export default function OrderDetailPage() {
  return (
    <GuestGate feature="Order details">
      <OrderDetailPageContent />
    </GuestGate>
  );
}

function OrderDetailPageContent() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<PharmacyOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function load() {
    apiGet<{ success: boolean; data?: PharmacyOrder; message?: string }>(`/api/orders/${params.id}`).then(
      ({ data }) => {
        if (data.success && data.data) {
          setOrder(data.data);
          if (data.data.paymentStatus !== "pending" && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } else {
          setError(data.message ?? "Could not load this order.");
        }
      }
    );
  }

  useEffect(() => {
    load();
    // Mirrors the mobile app's useOrderPaymentStatus hook: poll while
    // payment is still pending, since the redirect page itself carries no
    // status — the webhook updates it server-side independent of the
    // browser tab the payment provider redirects back to.
    pollRef.current = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (error) {
    return (
      <div>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/app/orders" className="mt-4 inline-block text-sm font-semibold text-primary">
          &larr; Back to orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return <p className="text-sm text-muted">Loading order...</p>;
  }

  const paymentInfo = PAYMENT_COPY[order.paymentStatus];

  return (
    <div>
      <Link href="/app/orders" className="text-sm font-semibold text-primary">
        &larr; Back to orders
      </Link>

      <div className="mx-auto mt-4 max-w-2xl rounded-card bg-card-bg shadow-atmospheric p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-heading">Order #{order.orderNumber.slice(0, 8)}</h1>
            <p className="text-xs text-muted">{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentInfo.className}`}>
            {paymentInfo.label}
          </span>
        </div>

        {order.paymentStatus === "pending" && (
          <p className="mt-2 text-xs text-muted">
            We&apos;re waiting for payment confirmation — this page updates automatically.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-heading">
                {item.name ?? item.productId} &times; {item.qty}
              </span>
              <span className="text-muted">₦{(item.price * item.qty).toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="text-heading">₦{order.subtotal.toLocaleString()}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-muted">Delivery</span>
            <span className="text-heading">₦{order.shippingFee.toLocaleString()}</span>
          </div>
          <div className="mt-2 flex justify-between font-bold text-heading">
            <span>Total</span>
            <span>₦{order.total.toLocaleString()}</span>
          </div>
        </div>

        {order.shippingAddress && (
          <div className="mt-5 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase text-muted">Delivery address</p>
            <p className="mt-1 text-sm text-body">
              {[
                order.shippingAddress.addressLine,
                order.shippingAddress.city,
                order.shippingAddress.lga,
                order.shippingAddress.state,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        )}

        {order.deliveryStatus && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase text-muted">Delivery status</p>
            <p className="mt-1 text-sm capitalize text-body">{order.deliveryStatus}</p>
          </div>
        )}
      </div>
    </div>
  );
}
