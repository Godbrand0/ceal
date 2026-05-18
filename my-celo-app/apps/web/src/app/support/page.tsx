"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, ChevronLeft, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "account",  label: "Account & Profile" },
  { id: "pledge",   label: "Date Pledge" },
  { id: "payment",  label: "Payments & cUSD" },
  { id: "match",    label: "Matches & Chat" },
  { id: "verify",   label: "Verification" },
  { id: "other",    label: "Other" },
];

const SUPPORT_EMAIL = "akinsanyadaniel665@gmail.com";

export default function SupportPage() {
  const router = useRouter();

  const [category, setCategory] = useState("");
  const [wallet, setWallet]     = useState("");
  const [message, setMessage]   = useState("");
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit() {
    if (!category || !message.trim()) {
      setError("Please select a category and describe your issue.");
      return;
    }
    setError("");
    setSending(true);
    try {
      const subject = encodeURIComponent(`[CEAL Support] ${CATEGORIES.find((c) => c.id === category)?.label ?? category}`);
      const body = encodeURIComponent(
        `Category: ${category}\nWallet: ${wallet || "not provided"}\n\n${message.trim()}`
      );
      window.open(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`, "_blank");
      setSent(true);
    } catch {
      setError("Something went wrong. Please email us directly.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-950 items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-xs">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30
                          flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-white text-xl font-bold">Message sent</h2>
          <p className="text-gray-400 text-sm">
            Your support request has been opened in your email client. We usually respond within 24 hours.
          </p>
          <button
            onClick={() => router.back()}
            className="w-full py-3 rounded-2xl bg-gray-800 text-gray-300 text-sm font-medium
                       hover:bg-gray-700 transition"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 pb-10">

      {/* Header */}
      <div className="pt-14 px-5 pb-4 flex items-center gap-3 border-b border-gray-800">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-300 transition">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-rose-400" />
          <h1 className="text-lg font-bold text-white">Support</h1>
        </div>
      </div>

      <div className="px-5 pt-6 space-y-5 max-w-lg mx-auto w-full">
        <p className="text-gray-400 text-sm">
          Having trouble? Describe your issue below and we&apos;ll get back to you as soon as possible.
        </p>

        {/* Category */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Category</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setCategory(id)}
                className={cn(
                  "py-2.5 px-3 rounded-xl border text-sm font-medium text-left transition",
                  category === id
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Wallet address */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Wallet address (optional)</label>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="0x..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                       text-white placeholder-gray-600 focus:outline-none focus:border-rose-500
                       text-sm font-mono transition"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Describe the issue</label>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what happened, what you expected, and any relevant transaction hashes..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                       text-white placeholder-gray-600 focus:outline-none focus:border-rose-500
                       text-sm transition resize-none"
          />
        </div>

        {error && (
          <p className="text-rose-400 text-sm bg-rose-500/10 rounded-xl px-4 py-2">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!category || !message.trim() || sending}
          className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50
                     font-semibold text-white text-sm transition flex items-center justify-center gap-2"
        >
          {sending ? (
            <><Loader2 size={16} className="animate-spin" /> Opening email…</>
          ) : "Send support request"}
        </button>

        <p className="text-center text-gray-600 text-xs">
          Or email us directly at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-gray-400 underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </div>
  );
}
