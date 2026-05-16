"use client";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { SelfAppBuilder, SelfQRcodeWrapper, getUniversalLink } from "@selfxyz/qrcode";
import { X, ShieldCheck, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { CONTRACT_ADDRESSES, ABIS } from "@/lib/contracts";
import { updateProfileVerified } from "@/lib/supabase";

interface Props {
  onClose: () => void;
  onVerified: () => void;
}

type Step = "qr" | "verifying" | "confirmed" | "error";

export function SelfVerificationModal({ onClose, onVerified }: Props) {
  const { address } = useAccount();
  const [step, setStep] = useState<Step>("qr");
  const [errMsg, setErrMsg] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const appUrl =
    typeof window !== "undefined" ? window.location.origin : "https://ceal.vercel.app";

  const selfApp = useMemo(() => {
    if (!address) return null;
    return new SelfAppBuilder({
      appName: "CEAL",
      scope: "ceal-age-verification",
      endpointType:
        process.env.NEXT_PUBLIC_CHAIN_ID === "42220" ? "https" : "staging_https",
      endpoint: `${appUrl}/api/self-verify`,
      userId: address,
      userIdType: "hex",
      devMode: process.env.NEXT_PUBLIC_CHAIN_ID !== "42220",
      disclosures: {
        minimumAge: 18,
        date_of_birth: false,
        name: false,
      },
      chainID: process.env.NEXT_PUBLIC_CHAIN_ID === "42220" ? 42220 : 11142220,
    }).build();
  }, [address, appUrl]);

  // After Self SDK verifies the proof, our API calls setVerified server-side.
  // We also call it client-side as owner on testnet for immediate UX.
  function handleSelfSuccess() {
    setStep("verifying");
    writeContract({
      address: CONTRACT_ADDRESSES.profileNFT,
      abi: ABIS.profileNFT,
      functionName: "setVerified",
      args: [address!],
    });
  }

  useEffect(() => {
    if (!txConfirmed || !address) return;
    updateProfileVerified(address, true)
      .then(() => {
        setStep("confirmed");
        setTimeout(onVerified, 1500);
      })
      .catch(() => {
        // Supabase update failed — still mark as confirmed on-chain
        setStep("confirmed");
        setTimeout(onVerified, 1500);
      });
  }, [txConfirmed, address, onVerified]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative w-full max-w-[430px] bg-gray-900 rounded-t-3xl
                      border-t border-gray-700 px-6 pt-6 pb-10 shadow-2xl">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-6" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-500 hover:text-gray-300"
        >
          <X size={20} />
        </button>

        {step === "qr" && (
          <>
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck size={24} className="text-blue-400" />
              <h2 className="text-lg font-bold text-white">Verify your identity</h2>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Scan with the{" "}
              <span className="text-white font-medium">Self app</span> to prove
              you&apos;re 18+ without revealing personal info.
            </p>

            {selfApp ? (
              <div className="flex justify-center rounded-2xl overflow-hidden bg-white p-3">
                <SelfQRcodeWrapper
                  selfApp={selfApp}
                  onSuccess={handleSelfSuccess}
                  onError={(e) => {
                    setErrMsg(e?.reason ?? "Verification failed. Try again.");
                    setStep("error");
                  }}
                  size={220}
                  showBorder={false}
                  showStatusText={true}
                />
              </div>
            ) : (
              <div className="flex justify-center py-12">
                <Loader2 size={32} className="text-rose-400 animate-spin" />
              </div>
            )}

            {/* Deep link for single-phone users */}
            {selfApp && (
              <a
                href={getUniversalLink(selfApp)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-2xl
                           border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition"
              >
                Open in Self app instead
              </a>
            )}

            <p className="text-center text-xs text-gray-600 mt-3">
              Your identity is never stored — only a ZK proof is verified.
            </p>
          </>
        )}

        {step === "verifying" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 size={48} className="text-blue-400 animate-spin" />
            <h2 className="text-lg font-bold text-white">Recording verification</h2>
            <p className="text-gray-400 text-sm text-center">
              Writing your verified badge to the blockchain…
            </p>
          </div>
        )}

        {step === "confirmed" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle size={56} className="text-emerald-400" />
            <h2 className="text-xl font-bold text-white">You&apos;re verified!</h2>
            <p className="text-gray-400 text-sm text-center">
              Your profile now shows a verified badge.
            </p>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <AlertCircle size={48} className="text-rose-400" />
            <h2 className="text-lg font-bold text-white">Verification failed</h2>
            <p className="text-gray-400 text-sm text-center">{errMsg}</p>
            <button
              onClick={() => setStep("qr")}
              className="mt-2 px-6 py-3 bg-rose-500 rounded-2xl text-white font-medium text-sm"
            >
              Try again
            </button>
          </div>
        )}

        {isPending && step === "verifying" && (
          <p className="text-center text-xs text-gray-600 mt-3">
            Confirm the transaction in your wallet
          </p>
        )}
      </div>
    </div>
  );
}
