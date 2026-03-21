"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import ReorderProductCard from "@/components/ReorderProductCard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface OrderData {
  orderId: string;
  productName: string;
  brand: string;
  quantity: number;
  priceInr: number;
  skuCategory: string;
  imageUrl: string | null;
  deliveredAt: string;
  reminderId: string | null;
}

export default function ReorderPage() {
  const params = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  const userId = searchParams.get("userId") ?? "anonymous";
  const orderId = params.orderId;

  const [order, setOrder] = useState<OrderData | null>(null);
  // Resolved from order API response (which joins reminders_sent); URL param is fallback
  const [reminderId, setReminderId] = useState<string | null>(
    searchParams.get("reminderId") ?? null
  );
  const [quantity, setQuantity] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const eventsTracked = useRef(false);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "Order not found");
        }
        const data = (await res.json()) as OrderData;
        setOrder(data);
        setQuantity(data.quantity);
        // Prefer reminderId from order API (resolved via DB join) over URL param
        if (data.reminderId) setReminderId(data.reminderId);
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Failed to load order"
        );
      }
    }
    void fetchOrder();
  }, [orderId]);

  // Fire reminder_opened + cart_prefilled once per reminder, across page loads.
  // localStorage key prevents re-firing on refresh (in-memory ref alone resets on reload).
  useEffect(() => {
    if (!order || eventsTracked.current) return;
    eventsTracked.current = true;

    if (reminderId) {
      const openedKey = `ozi_reminder_opened_${reminderId}`;
      const alreadyOpened = localStorage.getItem(openedKey);
      if (!alreadyOpened) {
        posthog?.capture("reminder_opened", {
          user_id: userId,
          reminder_id: reminderId,
          order_id: orderId,
        });
        localStorage.setItem(openedKey, "1");

        // Mark reminder as opened in DB so dashboard funnel reflects it
        void fetch("/api/reminders/opened", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reminderId }),
        });
      }
    }

    posthog?.capture("cart_prefilled", {
      user_id: userId,
      order_id: orderId,
      option: "B",
    });
  }, [order, userId, reminderId, orderId, posthog]);

  async function handleAddToCart() {
    if (!order) return;
    setAddLoading(true);
    setAddError(null);

    // Event 5: checkout_started (PostHog only — no DB row)
    posthog?.capture("checkout_started", {
      user_id: userId,
      source: "reminder",
    });

    try {
      const res = await fetch("/api/reorder-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-demo-key": process.env.NEXT_PUBLIC_DEMO_SECRET ?? "",
        },
        body: JSON.stringify({
          eventType: "order_placed",
          userId,
          orderId: order.orderId,
          reminderId,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to place order");
      }

      setSuccess(true);
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-base font-semibold text-slate-900">Reorder</h1>
            <p className="text-xs text-slate-400">Order #{orderId}</p>
          </div>
        </div>
      </div>

      {/* Simulated push notification banner — shows what the notification said */}
      <div className="bg-violet-600 text-white text-sm text-center py-2.5 px-4">
        <span className="font-medium text-violet-200 text-xs uppercase tracking-wider mr-2">
          Simulated push notification
        </span>
        "Your order was 18–20 days ago — time to restock? Reorder in 1 tap →"
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        {loadError ? (
          <div className="text-center space-y-3">
            <p className="text-red-500 font-medium">{loadError}</p>
            <p className="text-sm text-slate-400">
              Make sure you seeded the DB and the userId exists.
            </p>
            <Link href="/" className="text-sm text-violet-600 underline">
              Back to dashboard
            </Link>
          </div>
        ) : !order ? (
          <div className="text-slate-400 text-sm animate-pulse">
            Loading order…
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-6">
            <ReorderProductCard
              productName={order.productName}
              brand={order.brand}
              priceInr={order.priceInr}
              imageUrl={order.imageUrl}
              quantity={quantity}
              onQuantityChange={setQuantity}
              onAddToCart={handleAddToCart}
              loading={addLoading}
              success={success}
              error={addError}
            />

            {/* Context note */}
            <p className="text-xs text-slate-400 text-center">
              Last ordered{" "}
              {new Date(order.deliveredAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}{" "}
              · Quantity pre-set to your last order
            </p>
          </div>
        )}
      </div>

      {/* PostHog event log — dev only */}
      <div className="bg-slate-800 text-slate-400 text-xs px-4 py-3 text-center">
        PostHog events fired on this page:{" "}
        <code className="text-violet-300">reminder_opened</code>,{" "}
        <code className="text-violet-300">cart_prefilled</code>,{" "}
        <code className="text-violet-300">checkout_started</code>,{" "}
        <code className="text-violet-300">order_placed</code>
      </div>
    </main>
  );
}
