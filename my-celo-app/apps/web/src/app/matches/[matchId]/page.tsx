"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ArrowLeft, Gift, Lock, Send, Loader2 } from "lucide-react";
import { useMatchData } from "@/hooks/useMatches";
import { getProfile, getMessages, sendMessage, type DbProfile, type DbMessage } from "@/lib/supabase";
import { ipfsToHttp } from "@/lib/ipfs";
import { truncateAddress } from "@/lib/app-utils";
import { GiftModal } from "@/components/GiftModal";
import { GiftCard } from "@/components/GiftCard";
import { DatePledgeModal } from "@/components/DatePledgeModal";
import { cn } from "@/lib/utils";

export default function MatchChatPage() {
  const params  = useParams<{ matchId: string }>();
  const router  = useRouter();
  const { address } = useAccount();
  const matchId = BigInt(params.matchId ?? "0");

  const { match, refetch: refetchMatch } = useMatchData(matchId);

  const [otherProfile, setOtherProfile] = useState<DbProfile | null>(null);
  const [messages, setMessages]         = useState<DbMessage[]>([]);
  const [text, setText]                 = useState("");
  const [sending, setSending]           = useState(false);
  const [showGift, setShowGift]         = useState(false);
  const [showPledge, setShowPledge]     = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Load other user's profile
  useEffect(() => {
    if (!match || !address) return;
    const other = address.toLowerCase() === match.user1.toLowerCase() ? match.user2 : match.user1;
    getProfile(other).then(setOtherProfile);
  }, [match, address]);

  // Load & poll messages
  useEffect(() => {
    if (!params.matchId) return;
    const load = () => getMessages(params.matchId).then(setMessages);
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [params.matchId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!text.trim() || !address || !params.matchId) return;
    setSending(true);
    try {
      await sendMessage(params.matchId, address, text.trim());
      setText("");
    } finally {
      setSending(false);
    }
  }

  function handleGiftSent(giftType: number, amount: string, msg: string, txHash: string) {
    if (!address || !params.matchId) return;
    sendMessage(params.matchId, address, `🎁 Gift sent`, {
      gift_type: giftType,
      amount,
      tx_hash: txHash,
    });
  }

  const photo = otherProfile?.photos?.[0] ? ipfsToHttp(otherProfile.photos[0]) : null;
  const name  = otherProfile?.name ?? (match
    ? truncateAddress(address?.toLowerCase() === match.user1.toLowerCase() ? match.user2 : match.user1)
    : "…"
  );

  const otherAddress = match
    ? (address?.toLowerCase() === match.user1.toLowerCase() ? match.user2 : match.user1) as `0x${string}`
    : undefined;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40
                      bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3 pt-12">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition p-1">
            <ArrowLeft size={22} />
          </button>

          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 shrink-0">
            {photo ? (
              <img src={photo} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl bg-gradient-to-br from-rose-900/60 to-gray-800">
                🧑
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{name}</p>
            {match?.dateCompleted && (
              <p className="text-emerald-400 text-xs">Date completed ✓</p>
            )}
          </div>

          <button
            onClick={() => setShowPledge(true)}
            className="text-gray-400 hover:text-white transition p-1"
            title="Date Pledge"
          >
            <Lock size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-28 pb-24 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="text-4xl">💘</div>
            <p className="text-gray-400 text-sm">You matched! Say hello.</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender === address?.toLowerCase();
          return (
            <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
              {msg.gift_data ? (
                <GiftCard
                  giftType={msg.gift_data.gift_type}
                  amount={msg.gift_data.amount}
                  message={msg.content}
                  isReceived={!isMine}
                />
              ) : (
                <div className={cn(
                  "max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                  isMine
                    ? "bg-rose-500 text-white rounded-br-sm"
                    : "bg-gray-800 text-gray-100 rounded-bl-sm"
                )}>
                  {msg.content}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40
                      bg-gray-950/95 backdrop-blur border-t border-gray-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGift(true)}
            className="p-2.5 rounded-xl bg-gray-800 text-rose-400 hover:bg-gray-700 transition shrink-0"
          >
            <Gift size={20} />
          </button>

          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Message…"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-2xl px-4 py-2.5
                       text-white placeholder-gray-500 focus:outline-none focus:border-rose-500
                       text-sm"
          />

          <button
            disabled={!text.trim() || sending}
            onClick={handleSend}
            className="p-2.5 rounded-xl bg-rose-500 disabled:opacity-50 hover:bg-rose-600
                       transition shrink-0"
          >
            {sending ? <Loader2 size={18} className="animate-spin text-white" /> : <Send size={18} className="text-white" />}
          </button>
        </div>
      </div>

      {/* Modals */}
      {showGift && otherAddress && (
        <GiftModal
          matchId={matchId}
          recipient={otherAddress}
          onClose={() => setShowGift(false)}
          onSent={handleGiftSent}
        />
      )}

      {showPledge && match && (
        <DatePledgeModal
          matchId={matchId}
          proposer={match.user1}
          acceptor={match.user2}
          onClose={() => { setShowPledge(false); refetchMatch(); }}
        />
      )}
    </div>
  );
}
