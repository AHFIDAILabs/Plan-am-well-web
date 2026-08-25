"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Cart, DeliveryZoneState, UserProfile } from "@/lib/types";
import { GuestGate } from "@/components/auth/GuestGate";
import { logEvent } from "@/lib/analytics";

export default function CheckoutPage() {
  return (
    <GuestGate feature="Checkout">
      <CheckoutPageContent />
    </GuestGate>
  );
}

function CheckoutPageContent() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [zones, setZones] = useState<DeliveryZoneState[]>([]);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    gender: "",
    dateOfBirth: "",
    homeAddress: "",
    city: "",
    state: "",
    lga: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[] | null>(null);

  useEffect(() => {
    apiGet<{ success: boolean; data?: Cart }>("/api/cart").then(({ data }) => {
      if (data.success && data.data) setCart(data.data);
    });
    apiGet<{ success: boolean; data?: UserProfile }>("/api/users/me").then(({ data }) => {
      if (data.success && data.data) {
        const p = data.data;
        setForm((f) => ({
          ...f,
          name: p.name ?? "",
          phone: p.phone ?? "",
          email: p.email ?? "",
          gender: p.gender ?? "",
          dateOfBirth: p.dateOfBirth ?? "",
          homeAddress: p.homeAddress ?? "",
          city: p.city ?? "",
          state: p.state ?? "",
          lga: p.lga ?? "",
        }));
      }
    });
    apiGet<{ success: boolean; data?: DeliveryZoneState[] }>("/api/checkout/delivery-zones").then(({ data }) => {
      if (data.success && data.data) setZones(data.data);
    });
  }, []);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const selectedZone = zones.find((z) => z.state === form.state);
  const deliveryFee = useMemo(() => {
    const lga = selectedZone?.lgas.find((l) => l.name === form.lga);
    return lga?.price ?? 0;
  }, [selectedZone, form.lga]);

  const itemsTotal = cart?.totalPrice ?? 0;
  const grandTotal = itemsTotal + deliveryFee;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMissingFields(null);
    setSubmitting(true);

    const { data: checkoutData } = await apiPost<{
      success: boolean;
      message?: string;
      code?: string;
      missingFields?: string[];
      localOrder?: { _id: string };
    }>("/api/checkout", { ...form, deliveryFee });

    if (checkoutData.code === "PROFILE_INCOMPLETE") {
      setSubmitting(false);
      setMissingFields(checkoutData.missingFields ?? []);
      return;
    }
    if (!checkoutData.success || !checkoutData.localOrder) {
      setSubmitting(false);
      setError(checkoutData.message ?? "Could not start checkout.");
      return;
    }

    const orderId = checkoutData.localOrder._id;

    const { data: confirmData } = await apiPost<{
      success: boolean;
      message?: string;
      checkoutUrl?: string;
    }>("/api/checkout/confirm", { orderId });

    setSubmitting(false);

    if (confirmData.success && confirmData.checkoutUrl) {
      logEvent("order_placed", { item_count: cart?.items.length ?? 0 });
      window.location.href = confirmData.checkoutUrl;
    } else {
      setError(confirmData.message ?? "Could not start payment. Your order was saved — check Order History.");
    }
  }

  if (cart && cart.items.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-heading">Checkout</h1>
        <div className="mt-6 rounded-card bg-card-bg shadow-atmospheric p-6 text-center">
          <p className="text-sm text-muted">Your cart is empty.</p>
          <Link href="/app/pharmacy" className="mt-2 inline-block text-sm font-semibold text-primary">
            Browse products &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">Checkout</h1>

      {missingFields && missingFields.length > 0 && (
        <div className="mt-4 rounded-lg border border-secondary bg-accent-amber-bg p-3 text-sm text-heading">
          <p className="font-semibold">Please complete these fields:</p>
          <ul className="mt-1 list-inside list-disc">
            {missingFields.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 lg:col-span-2">
          <div className="rounded-card bg-card-bg shadow-atmospheric p-5">
            <h2 className="font-bold text-heading">Contact details</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Full name" required value={form.name} onChange={(e) => update("name", e.target.value)} />
              <Input
                label="Phone number"
                required
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
              <Input label="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
              <Select label="Gender" value={form.gender} onChange={(e) => update("gender", e.target.value)}>
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
              <Input
                label="Date of birth"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => update("dateOfBirth", e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-card bg-card-bg shadow-atmospheric p-5">
            <h2 className="font-bold text-heading">Delivery address</h2>
            <div className="mt-4 grid grid-cols-1 gap-4">
              <Input
                label="Home address"
                required
                value={form.homeAddress}
                onChange={(e) => update("homeAddress", e.target.value)}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Input label="City" value={form.city} onChange={(e) => update("city", e.target.value)} />
                <Select label="State" value={form.state} onChange={(e) => update("state", e.target.value)}>
                  <option value="">Select...</option>
                  {zones.map((z) => (
                    <option key={z.state} value={z.state}>
                      {z.state}
                    </option>
                  ))}
                </Select>
                <Select
                  label="LGA"
                  value={form.lga}
                  onChange={(e) => update("lga", e.target.value)}
                  disabled={!selectedZone}
                  className="disabled:opacity-50"
                >
                  <option value="">Select...</option>
                  {selectedZone?.lgas.map((l) => (
                    <option key={l.name} value={l.name}>
                      {l.name} (₦{l.price.toLocaleString()})
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" loading={submitting} className="w-full">
            Continue to payment
          </Button>
        </form>

        <div className="rounded-card bg-card-bg shadow-atmospheric p-5">
          <h2 className="font-bold text-heading">Order summary</h2>
          <div className="mt-3 flex justify-between text-sm">
            <span className="text-muted">Items ({cart?.totalItems ?? 0})</span>
            <span className="text-heading">₦{itemsTotal.toLocaleString()}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-muted">Delivery</span>
            <span className="text-heading">₦{deliveryFee.toLocaleString()}</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-border pt-3 font-bold text-heading">
            <span>Total</span>
            <span>₦{grandTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
