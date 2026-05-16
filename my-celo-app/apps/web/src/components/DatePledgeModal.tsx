"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { X, Lock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useDatePledge } from "@/hooks/useDatePledge";
import { useAccount } from "wagmi";
import { cn } from "@/lib/utils";
import type { PledgeData } from "@/lib/types";

interface DatePledgeModalProps {
  matchId:  bigint;
  pledgeId?: bigint;
  proposer?: string;
  acceptor?: string;
  onClose:  () => void;
}

// PledgeStatus enum mirrors the contract
const STATUS_LABEL: Record<number, string> = {
  0: "Proposed",
  1: "Accepted",
  2: "Locked",
  3: "Completed",
  4: "Ghosted",
  5: "Cancelled",
};

export function DatePledgeModal({ matchId, pledgeId, proposer, acceptor, onClose }: DatePledgeModalProps) {
  const { address } = useAccount();
  const { pledge, propose, accept, lock, confirm, claimGhost, cancel, isPending, refetch } =
    useDatePledge(pledgeId);

  const [tab, setTab]           = useState<"new" | "existing">(pledgeId ? "existing" : "new");
  const [amount, setAmount]     = useState("1");
  const [date, setDate]         = useState("");
  const [error, setError]       = useState("");

  const isProposer = address?.toLowerCase() === proposer?.toLowerCase();
  const isAcceptor = address?.toLowerCase() === acceptor?.toLowerCase();

  async function handlePropose() {
    if (!date || !amount) return;
    setError("");
    try {
      const unixTs = BigInt(Math.floor(new Date(date).getTime() / 1000));
      await propose(matchId, amount, unixTs);
      await refetch();
      setTab("existing");
    } catch (err: any) {
      setError(err?.shortMessage ?? err?.message ?? "Failed");
    }
  }

  async function act(fn: () => Promise<any>) {
    setError("");
    try {
      await fn();
      await refetch();
    } catch (err: any) {
      setError(err?.shortMessage ?? err?.message ?? "Failed");
    }
  }

  const typedPledge = pledge as PledgeData | undefined;
  const status = typedPledge ? Number(typedPledge.status) : -1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 28 }}
        className="w-full max-w-[430px] bg-gray-900 rounded-t-3xl border-t border-gray-800 p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-rose-400" />
            <h2 className="text-lg font-bold text-white">Date Pledge</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={22} />
          </button>
        </div>

        <p className="text-gray-400 text-xs mb-5">
          Both parties lock cUSD before the date. Ghost = other person gets both deposits.
        </p>

        {/* Tabs */}
        {!pledgeId && (
          <div className="flex gap-2 mb-5">
            {(["new", "existing"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-sm font-medium transition",
                  tab === t ? "bg-rose-500 text-white" : "bg-gray-800 text-gray-400"
                )}
              >
                {t === "new" ? "Propose date" : "Active pledge"}
              </button>
            ))}
          </div>
        )}

        {tab === "new" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date & time</label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                           text-white focus:outline-none focus:border-rose-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Pledge amount (cUSD each)</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                           text-white focus:outline-none focus:border-rose-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 0.5 cUSD · 5% protocol fee on lock</p>
            </div>
            {error && <p className="text-rose-400 text-sm bg-rose-500/10 rounded-xl px-4 py-2">{error}</p>}
            <button
              disabled={!date || !amount || isPending}
              onClick={handlePropose}
              className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50
                         font-semibold text-white transition flex items-center justify-center gap-2"
            >
              {isPending ? <><Loader2 size={18} className="animate-spin" /> Proposing…</> : "Propose date pledge"}
            </button>
          </div>
        ) : typedPledge ? (
          <div className="space-y-4">
            {/* Status banner */}
            <div className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3",
              status === 3 ? "bg-emerald-500/15 border border-emerald-500/30" :
              status === 4 ? "bg-rose-500/15 border border-rose-500/30" :
              "bg-gray-800 border border-gray-700"
            )}>
              {status === 3 ? <CheckCircle size={18} className="text-emerald-400" /> :
               status === 4 ? <AlertCircle size={18} className="text-rose-400" /> :
               <Lock size={18} className="text-yellow-400" />}
              <div>
                <p className="text-white text-sm font-medium">
                  Status: {STATUS_LABEL[status] ?? "Unknown"}
                </p>
                <p className="text-gray-400 text-xs">
                  {Number(typedPledge!.amountEach) / 1e18} cUSD each
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              {status === 0 && isAcceptor && (
                <button onClick={() => act(() => accept(pledgeId!))}
                  disabled={isPending}
                  className="w-full py-3 rounded-2xl bg-rose-500 text-white font-medium text-sm transition">
                  {isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Accept pledge"}
                </button>
              )}
              {status === 1 && (
                <button onClick={() => act(() => lock(pledgeId!, Number(typedPledge!.amountEach) / 1e18 + ""))}
                  disabled={isPending}
                  className="w-full py-3 rounded-2xl bg-yellow-500 text-white font-medium text-sm transition">
                  {isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Lock my deposit"}
                </button>
              )}
              {status === 2 && (
                <button onClick={() => act(() => confirm(pledgeId!))}
                  disabled={isPending}
                  className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-medium text-sm transition">
                  {isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Confirm date happened ✓"}
                </button>
              )}
              {status === 2 && (
                <button onClick={() => act(() => claimGhost(pledgeId!))}
                  disabled={isPending}
                  className="w-full py-3 rounded-2xl bg-gray-700 text-gray-300 font-medium text-sm transition">
                  {isPending ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Claim ghost (after 48h)"}
                </button>
              )}
              {(status === 0 || status === 1) && (
                <button onClick={() => act(() => cancel(pledgeId!))}
                  disabled={isPending}
                  className="w-full py-3 rounded-2xl bg-gray-800 text-gray-400 font-medium text-sm transition">
                  Cancel pledge
                </button>
              )}
            </div>

            {error && <p className="text-rose-400 text-sm bg-rose-500/10 rounded-xl px-4 py-2">{error}</p>}
          </div>
        ) : (
          <p className="text-center text-gray-500 text-sm py-6">No active pledge for this match.</p>
        )}
      </motion.div>
    </motion.div>
  );
}
