"use client";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  X, Lock, CheckCircle, AlertCircle, Loader2, Camera, Upload,
  RotateCcw, ShieldAlert, Clock
} from "lucide-react";
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

const STATUS_LABEL: Record<number, string> = {
  0: "Proposed",
  1: "Accepted",
  2: "Locked",
  3: "Completed",
  4: "Cancelled",
};

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatCountdown(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h remaining`;
  if (h > 0) return `${h}h ${m}m remaining`;
  return `${m}m remaining`;
}

export function DatePledgeModal({ matchId, pledgeId, proposer, acceptor, onClose }: DatePledgeModalProps) {
  const { address } = useAccount();
  const {
    pledge, propose, accept, lock, confirm, unstake,
    signMutualCancel, resolveTimeout, cancel, isPending, refetch,
  } = useDatePledge(pledgeId);

  const [tab, setTab]               = useState<"new" | "existing">(pledgeId ? "existing" : "new");
  const [amount, setAmount]         = useState("1");
  const [date, setDate]             = useState("");
  const [error, setError]           = useState("");

  // confirm photo flow
  const [photoFile, setPhotoFile]   = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [verifying, setVerifying]   = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    verified: boolean; confidence: number; notes: string;
  } | null>(null);
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // cancel flow
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const isProposer = address?.toLowerCase() === proposer?.toLowerCase();
  const isAcceptor = address?.toLowerCase() === acceptor?.toLowerCase();

  const typedPledge = pledge as PledgeData | undefined;
  const status = typedPledge ? Number(typedPledge.status) : -1;

  const nowSec = Math.floor(Date.now() / 1000);
  const scheduledAt = typedPledge ? Number(typedPledge.scheduledAt) : 0;
  const cancelSignedAt = typedPledge ? Number(typedPledge.cancelSignedAt) : 0;
  const isBeforeDate = scheduledAt > 0 && nowSec < scheduledAt;
  const timeoutAt = cancelSignedAt > 0 ? cancelSignedAt + 7 * 24 * 3600 : 0;
  const timeoutReached = timeoutAt > 0 && nowSec > timeoutAt;
  const secondsToTimeout = timeoutAt > 0 ? Math.max(0, timeoutAt - nowSec) : 0;

  const iHaveSigned = typedPledge
    ? (isProposer ? typedPledge.proposerCancelSigned : typedPledge.acceptorCancelSigned)
    : false;
  const otherSigned = typedPledge
    ? (isProposer ? typedPledge.acceptorCancelSigned : typedPledge.proposerCancelSigned)
    : false;

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

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setVerifyResult(null);
  }

  async function handleVerifyAndConfirm() {
    if (!photoFile || !pledgeId) return;
    setError("");
    setVerifying(true);
    try {
      const { base64, mimeType } = await fileToBase64(photoFile);
      const res = await fetch("/api/verify-date-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image: base64, mimeType }),
      });
      const data = await res.json();
      setVerifyResult(data);

      if (data.verified) {
        await act(() => confirm(pledgeId));
        setShowConfirmForm(false);
      }
    } catch (err: any) {
      setError(err?.message ?? "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  async function handleSignCancel() {
    if (!pledgeId) return;
    setError("");
    try {
      await act(() => signMutualCancel(pledgeId));
      setShowCancelForm(false);
    } catch (err: any) {
      setError(err?.shortMessage ?? err?.message ?? "Failed");
    }
  }

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
        className="w-full max-w-[430px] bg-gray-900 rounded-t-3xl border-t border-gray-800 p-6 max-h-[90vh] overflow-y-auto"
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

        <div className="bg-gray-800/60 rounded-2xl px-4 py-3 mb-5 space-y-1 text-xs text-gray-400">
          <p>• Cancel before date → 100% refund, no fee</p>
          <p>• Confirm date with photo → 100% refund, no fee</p>
          <p>• Mutual cancel after date → 20% fee to platform</p>
        </div>

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
              <p className="text-xs text-gray-500 mt-1">Minimum 0.5 cUSD each</p>
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
              status === 4 ? "bg-gray-700/50 border border-gray-600" :
              "bg-gray-800 border border-gray-700"
            )}>
              {status === 3 ? <CheckCircle size={18} className="text-emerald-400" /> :
               status === 4 ? <AlertCircle size={18} className="text-gray-400" /> :
               <Lock size={18} className="text-yellow-400" />}
              <div>
                <p className="text-white text-sm font-medium">
                  Status: {STATUS_LABEL[status] ?? "Unknown"}
                </p>
                <p className="text-gray-400 text-xs">
                  {(Number(typedPledge.amountEach) / 1e18).toFixed(2)} cUSD each ·{" "}
                  {scheduledAt > 0 ? new Date(scheduledAt * 1000).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>

            {/* Locked — pre-date actions */}
            {status === 2 && isBeforeDate && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl px-4 py-3">
                <p className="text-blue-300 text-xs">
                  Date hasn't happened yet. You can unstake for a full refund, or wait until after the date.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              {/* Accept */}
              {status === 0 && isAcceptor && (
                <button onClick={() => act(() => accept(pledgeId!))}
                  disabled={isPending}
                  className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-medium text-sm transition flex items-center justify-center gap-2">
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : "Accept pledge"}
                </button>
              )}

              {/* Lock */}
              {status === 1 && (
                <button onClick={() => act(() => lock(pledgeId!, (Number(typedPledge.amountEach) / 1e18).toString()))}
                  disabled={isPending}
                  className="w-full py-3 rounded-2xl bg-yellow-500 hover:bg-yellow-600 text-white font-medium text-sm transition flex items-center justify-center gap-2">
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <><Lock size={15} /> Lock my deposit</>}
                </button>
              )}

              {/* Unstake before date — full refund */}
              {status === 2 && isBeforeDate && (
                <button onClick={() => act(() => unstake(pledgeId!))}
                  disabled={isPending}
                  className="w-full py-3 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition flex items-center justify-center gap-2">
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <><RotateCcw size={15} /> Unstake — full refund</>}
                </button>
              )}

              {/* Confirm date with photo */}
              {status === 2 && !isBeforeDate && !showCancelForm && (
                <button onClick={() => setShowConfirmForm((v) => !v)}
                  className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition flex items-center justify-center gap-2">
                  <Camera size={15} /> Confirm date happened ✓
                </button>
              )}

              {/* Confirm photo form */}
              {status === 2 && showConfirmForm && (
                <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
                  <p className="text-white text-sm font-medium">Upload a photo from the date</p>
                  <p className="text-gray-400 text-xs">AI will verify both people are present. On success, full refunds are released.</p>

                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 text-sm flex items-center justify-center gap-2 hover:border-gray-400 transition"
                  >
                    <Upload size={16} /> {photoFile ? photoFile.name : "Choose photo"}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

                  {photoPreview && (
                    <img src={photoPreview} alt="preview" className="w-full h-40 object-cover rounded-xl" />
                  )}

                  {verifyResult && !verifyResult.verified && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                      <p className="text-rose-400 text-xs font-medium">Verification failed</p>
                      <p className="text-gray-400 text-xs mt-1">{verifyResult.notes}</p>
                      <p className="text-gray-500 text-xs">Confidence: {Math.round((verifyResult.confidence ?? 0) * 100)}%</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => setShowConfirmForm(false)}
                      className="flex-1 py-2.5 rounded-xl bg-gray-700 text-gray-300 text-sm font-medium">
                      Back
                    </button>
                    <button
                      onClick={handleVerifyAndConfirm}
                      disabled={!photoFile || verifying || isPending}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2"
                    >
                      {verifying ? <><Loader2 size={14} className="animate-spin" /> Verifying…</> : "Verify & Confirm"}
                    </button>
                  </div>
                </div>
              )}

              {/* Mutual cancel after date */}
              {status === 2 && !isBeforeDate && !showConfirmForm && (
                <button onClick={() => setShowCancelForm((v) => !v)}
                  className="w-full py-3 rounded-2xl bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium text-sm transition flex items-center justify-center gap-2">
                  <ShieldAlert size={15} /> Date didn't happen — Request cancel
                </button>
              )}

              {/* Cancel form */}
              {status === 2 && showCancelForm && (
                <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
                  <p className="text-white text-sm font-medium">Request mutual cancellation</p>
                  <p className="text-gray-400 text-xs">Both parties must sign. Platform keeps 20% as a no-show fee. 7-day timeout if the other party doesn't respond.</p>

                  {/* Who has signed */}
                  <div className="flex gap-2">
                    <div className={cn("flex-1 rounded-xl px-3 py-2 text-center text-xs", iHaveSigned ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-700 text-gray-500")}>
                      You {iHaveSigned ? "✓ signed" : "— not signed"}
                    </div>
                    <div className={cn("flex-1 rounded-xl px-3 py-2 text-center text-xs", otherSigned ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-700 text-gray-500")}>
                      Them {otherSigned ? "✓ signed" : "— not signed"}
                    </div>
                  </div>

                  {cancelSignedAt > 0 && !timeoutReached && (
                    <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 rounded-xl px-3 py-2">
                      <Clock size={13} /> {formatCountdown(secondsToTimeout)} for other party to respond
                    </div>
                  )}

                  {!iHaveSigned && (
                    <>
                      <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Brief reason (e.g., they didn't show up)..."
                        rows={3}
                        className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-rose-500"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setShowCancelForm(false)}
                          className="flex-1 py-2.5 rounded-xl bg-gray-700 text-gray-300 text-sm font-medium">
                          Back
                        </button>
                        <button
                          onClick={handleSignCancel}
                          disabled={!cancelReason.trim() || isPending}
                          className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2"
                        >
                          {isPending ? <Loader2 size={14} className="animate-spin" /> : "Sign cancel"}
                        </button>
                      </div>
                    </>
                  )}

                  {timeoutReached && (
                    <button onClick={() => act(() => resolveTimeout(pledgeId!))}
                      disabled={isPending}
                      className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition flex items-center justify-center gap-2">
                      {isPending ? <Loader2 size={16} className="animate-spin" /> : <><Clock size={15} /> Resolve timeout (7 days elapsed)</>}
                    </button>
                  )}
                </div>
              )}

              {/* Pre-lock cancel */}
              {(status === 0 || status === 1) && (
                <button onClick={() => act(() => cancel(pledgeId!))}
                  disabled={isPending}
                  className="w-full py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-400 font-medium text-sm transition">
                  Cancel pledge — full refund
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
