"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Zap } from "lucide-react";

export function BulkCheckButton({ productIds, disabledReason }: { productIds: string[]; disabledReason?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const disabled = loading || productIds.length === 0 || Boolean(disabledReason);

  const runBulkCheck = async () => {
    if (disabled) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/monitoring/bulk-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk check failed");
      setMessage(`${data.success || 0} checked, ${data.failed || 0} failed.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bulk check failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={runBulkCheck}
        disabled={disabled}
        title={disabledReason}
        className="inline-flex items-center gap-2 rounded-xl bg-[#ff690c] px-4 py-2 text-sm font-black text-white shadow-[0_8px_18px_rgba(255,105,12,0.18)] hover:bg-[#e85f0a] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {loading ? "Checking..." : `Check queue${productIds.length ? ` (${productIds.length})` : ""}`}
      </button>
      {(message || disabledReason) && <p className="max-w-[260px] text-right text-xs font-bold text-[#8a7668]">{message || disabledReason}</p>}
    </div>
  );
}
