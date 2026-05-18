"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount, useDisconnect, useWriteContract,
  useWaitForTransactionReceipt, useBalance,
} from "wagmi";
import {
  BadgeCheck, Zap, ExternalLink, LogOut, Trophy, Star,
  Loader2, ShieldCheck, Pencil, X, Camera,
} from "lucide-react";
import { celoSepolia } from "wagmi/chains";
import { BottomNav } from "@/components/BottomNav";
import { SelfVerificationModal } from "@/components/SelfVerificationModal";
import { useProfile, useUpdateMetadata } from "@/hooks/useProfile";
import { useUserMatches } from "@/hooks/useMatches";
import { usePremium } from "@/hooks/usePremium";
import {
  getProfile, upsertProfile, updateProfileTalent,
  getMutualMatchCount, type DbProfile,
} from "@/lib/supabase";
import { uploadFileToPinata, uploadJsonToPinata, ipfsToHttp } from "@/lib/ipfs";
import { truncateAddress } from "@/lib/app-utils";
import { CONTRACT_ADDRESSES, ABIS, CUSD_SEPOLIA } from "@/lib/contracts";

interface TalentPassport {
  score: number;
  activity_score: number;
  identity_score: number;
  skills_score: number;
  passport_id: number;
}

// ── Edit sheet ────────────────────────────────────────────────────────────────
interface EditSheetProps {
  profile: DbProfile;
  address: string;
  onSave: (updated: DbProfile) => void;
  onClose: () => void;
}

function EditSheet({ profile, address, onSave, onClose }: EditSheetProps) {
  const { update, isPending: isOnchainPending } = useUpdateMetadata();

  const [form, setForm] = useState({
    name: profile.name ?? "",
    bio:  profile.bio  ?? "",
    city: profile.city ?? "",
    photo: null as File | null,
    photoPreview: profile.photos?.[0] ? ipfsToHttp(profile.photos[0]) : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    if (!form.name.trim() || !form.city.trim()) {
      setError("Name and city are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let photos = profile.photos ?? [];

      // Upload new photo if picked
      if (form.photo) {
        const uri = await uploadFileToPinata(form.photo);
        photos = [uri, ...photos.filter((p) => p !== photos[0])];
      }

      // Save off-chain
      const updated: Partial<DbProfile> & { address: string } = {
        address,
        name:   form.name.trim(),
        bio:    form.bio.trim(),
        city:   form.city.trim(),
        photos,
        age:    profile.age,
        token_id: profile.token_id,
        is_verified: profile.is_verified,
        talent_profile_id: profile.talent_profile_id,
      };
      await upsertProfile(updated);

      // Update on-chain metadata URI (best-effort)
      try {
        const metadataUri = await uploadJsonToPinata({
          name:    form.name.trim(),
          bio:     form.bio.trim(),
          age:     profile.age,
          city:    form.city.trim(),
          photos,
          address,
        });
        await update(metadataUri);
      } catch {
        // On-chain update failed — off-chain already saved, surface no error
      }

      onSave({ ...profile, ...updated, photos } as DbProfile);
    } catch (err: any) {
      setError(err?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-gray-900 rounded-t-3xl
                      border-t border-gray-700 px-6 pt-6 pb-10 shadow-2xl">
        <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-6" />
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-500 hover:text-gray-300">
          <X size={20} />
        </button>

        <h2 className="text-lg font-bold text-white mb-6">Edit profile</h2>

        {/* Photo picker */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-800
                       border-2 border-dashed border-rose-500/40 hover:border-rose-500 transition"
          >
            {form.photoPreview ? (
              <img src={form.photoPreview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-1 text-gray-500">
                <Camera size={22} />
                <span className="text-xs">Photo</span>
              </div>
            )}
            <div className="absolute bottom-1 right-1 w-6 h-6 bg-rose-500 rounded-full
                            flex items-center justify-center">
              <Pencil size={10} className="text-white" />
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setForm((f) => ({
                ...f,
                photo: file,
                photoPreview: URL.createObjectURL(file),
              }));
            }}
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                         text-white placeholder-gray-500 focus:outline-none focus:border-rose-500
                         text-sm transition"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">City</label>
            <input
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                         text-white placeholder-gray-500 focus:outline-none focus:border-rose-500
                         text-sm transition"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Bio</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                         text-white placeholder-gray-500 focus:outline-none focus:border-rose-500
                         text-sm transition resize-none"
            />
          </div>
        </div>

        {error && (
          <p className="text-rose-400 text-xs mt-3 bg-rose-500/10 rounded-xl px-4 py-2">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving || isOnchainPending}
          className="w-full mt-6 py-4 rounded-2xl bg-rose-500 hover:bg-rose-600
                     disabled:opacity-50 font-semibold text-white text-sm transition"
        >
          {saving || isOnchainPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Saving…
            </span>
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { tokenId, isVerified, hasProfile, refetch } = useProfile();
  const { matchIds } = useUserMatches();
  const { isBoosted } = usePremium();

  const { data: cusdBalance } = useBalance({
    address,
    token: CUSD_SEPOLIA,
    chainId: celoSepolia.id,
    query: { enabled: !!address },
  });

  const { writeContract, data: talentTxHash, isPending: talentPending } = useWriteContract();
  const { isSuccess: talentTxDone } = useWaitForTransactionReceipt({ hash: talentTxHash });

  const [dbProfile, setDbProfile]             = useState<DbProfile | null>(null);
  const [profileLoading, setProfileLoading]   = useState(true);
  const [matchCount, setMatchCount]           = useState(0);
  const [showSelfModal, setShowSelfModal]     = useState(false);
  const [showEditSheet, setShowEditSheet]     = useState(false);
  const [talentPassport, setTalentPassport]   = useState<TalentPassport | null>(null);
  const [talentLoading, setTalentLoading]     = useState(false);
  const [talentLinking, setTalentLinking]     = useState(false);
  const [talentManualId, setTalentManualId]   = useState("");
  const isFirstLoad                           = useRef(true);

  // Auth guard
  useEffect(() => {
    if (address === undefined) return; // wagmi still initialising
    if (!address) router.replace("/");
  }, [address, router]);

  const loadProfile = useCallback(async () => {
    if (!address) return;
    if (isFirstLoad.current) {
      setProfileLoading(true);
      isFirstLoad.current = false;
    }
    const [p, count] = await Promise.all([
      getProfile(address),
      getMutualMatchCount(address),
    ]);
    setDbProfile(p);
    setMatchCount(Math.max(count, matchIds.length));
    setProfileLoading(false);
  }, [address, matchIds.length]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Talent Protocol lookup
  useEffect(() => {
    if (!address) return;
    setTalentLoading(true);
    fetch(`/api/talent-protocol?wallet=${address}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error !== "api_key_not_configured") setTalentPassport(d.passport ?? null);
      })
      .catch(() => {})
      .finally(() => setTalentLoading(false));
  }, [address]);

  // After on-chain Talent link confirms, update Supabase
  useEffect(() => {
    if (!talentTxDone || !address || !talentPassport) return;
    setTalentLinking(false);
    updateProfileTalent(address, String(talentPassport.passport_id))
      .then(loadProfile)
      .catch(console.error);
  }, [talentTxDone, address, talentPassport, loadProfile]);

  function handleLinkTalent() {
    const profileId = talentPassport ? String(talentPassport.passport_id) : talentManualId.trim();
    if (!profileId || !address) return;
    setTalentLinking(true);
    writeContract({
      address: CONTRACT_ADDRESSES.profileNFT,
      abi: ABIS.profileNFT,
      functionName: "linkTalentProtocol",
      args: [profileId],
    });
  }

  const photo         = dbProfile?.photos?.[0] ? ipfsToHttp(dbProfile.photos[0]) : null;
  const talentLinked  = !!dbProfile?.talent_profile_id;
  const cusdFormatted = cusdBalance
    ? parseFloat(cusdBalance.formatted).toFixed(2)
    : null;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (!address || profileLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-screen pb-24">
        <div className="pt-14 px-5 pb-4 flex items-center justify-between border-b border-gray-800">
          <div className="h-6 w-20 bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-8 w-28 bg-gray-800 rounded-full animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-4 px-6 pt-8 pb-6">
          <div className="w-28 h-28 rounded-full bg-gray-800 animate-pulse" />
          <div className="h-6 w-32 bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-4 w-20 bg-gray-800 rounded-lg animate-pulse" />
        </div>
        <div className="mx-5 h-20 bg-gray-800 rounded-2xl animate-pulse" />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-24">

      {/* ── Header ── */}
      <div className="pt-14 px-5 pb-4 flex items-center justify-between border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">Profile</h1>
        <div className="flex items-center gap-3">
          {address && (
            <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700
                             rounded-full px-3 py-1 font-mono">
              {truncateAddress(address)}
            </span>
          )}
          <button
            onClick={() => disconnect()}
            className="text-gray-500 hover:text-gray-300 transition p-1"
            title="Disconnect"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* ── Avatar + name ── */}
      <div className="flex flex-col items-center gap-4 px-6 pt-8 pb-6">
        <div className="relative">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-800 border-4 border-gray-700 shadow-xl">
            {photo ? (
              <img src={photo} alt={dbProfile?.name ?? ""} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl
                              bg-gradient-to-br from-rose-900/60 to-gray-800">
                🧑
              </div>
            )}
          </div>
          {isBoosted && (
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-yellow-500
                            flex items-center justify-center border-2 border-gray-950">
              <Zap size={14} className="text-white" />
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-2xl font-bold text-white">
              {dbProfile?.name ?? truncateAddress(address)}
            </h2>
            {isVerified && <BadgeCheck size={22} className="text-blue-400" />}
          </div>
          {dbProfile && (
            <p className="text-gray-400 text-sm mt-0.5">
              {dbProfile.age} · {dbProfile.city}
            </p>
          )}
          {dbProfile?.bio && (
            <p className="text-gray-500 text-xs mt-2 max-w-xs leading-relaxed">{dbProfile.bio}</p>
          )}
        </div>

        {/* Edit button */}
        <button
          onClick={() => setShowEditSheet(true)}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-gray-800
                     border border-gray-700 text-gray-300 hover:bg-gray-700 text-sm transition"
        >
          <Pencil size={14} />
          Edit profile
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-px bg-gray-800 mx-5 rounded-2xl overflow-hidden mb-5">
        {[
          { label: "Matches",  value: matchCount },
          { label: "Token ID", value: tokenId ? `#${tokenId}` : "—" },
          { label: "Status",   value: isVerified ? "Verified ✓" : "Unverified" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 flex flex-col items-center py-4 gap-1">
            <span className="text-white font-bold text-lg">{value}</span>
            <span className="text-gray-500 text-xs">{label}</span>
          </div>
        ))}
      </div>

      {/* ── cUSD balance ── */}
      {cusdFormatted !== null && (
        <div className="mx-5 mb-4 flex items-center justify-between
                        bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
          <div>
            <p className="text-gray-400 text-xs mb-0.5">cUSD Balance</p>
            <p className="text-white font-bold text-xl">{cusdFormatted} <span className="text-gray-500 text-sm font-normal">cUSD</span></p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20
                          flex items-center justify-center text-lg">
            💵
          </div>
        </div>
      )}

      {/* ── ProfileNFT card ── */}
      {hasProfile && (
        <div className="mx-5 mb-4 rounded-2xl bg-gradient-to-br from-rose-900/30 to-gray-800
                        border border-rose-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
              <Trophy size={22} className="text-rose-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">ProfileNFT #{tokenId?.toString()}</p>
              <p className="text-gray-500 text-xs">Soulbound · Non-transferable</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Talent Protocol ── */}
      {hasProfile && (
        <div className="mx-5 mb-4">
          {talentLinked ? (
            <div className="flex items-center gap-3 bg-gray-800 rounded-2xl px-4 py-4">
              <Star size={18} className="text-amber-400" />
              <div>
                <p className="text-white text-sm font-medium">Talent Protocol</p>
                <p className="text-emerald-400 text-xs">Linked · ID {dbProfile?.talent_profile_id} ✓</p>
              </div>
            </div>
          ) : talentLoading ? (
            <div className="flex items-center gap-3 bg-gray-800 rounded-2xl px-4 py-4">
              <Loader2 size={16} className="text-gray-500 animate-spin" />
              <span className="text-gray-500 text-sm">Looking up builder score…</span>
            </div>
          ) : talentPassport ? (
            <div className="bg-gray-800 rounded-2xl px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-amber-400" />
                  <span className="text-white font-medium text-sm">Talent Protocol</span>
                </div>
                <button
                  onClick={handleLinkTalent}
                  disabled={talentPending || talentLinking}
                  className="text-xs text-rose-400 font-medium disabled:opacity-50"
                >
                  {talentPending || talentLinking
                    ? <Loader2 size={12} className="animate-spin" />
                    : "Link on-chain"}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Builder",  value: talentPassport.score },
                  { label: "Activity", value: talentPassport.activity_score },
                  { label: "Identity", value: talentPassport.identity_score },
                  { label: "Skills",   value: talentPassport.skills_score },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-900 rounded-xl p-2 text-center">
                    <p className="text-white font-bold text-base">{value ?? "—"}</p>
                    <p className="text-gray-500 text-[10px]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-2xl px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Star size={18} className="text-amber-400" />
                <span className="text-white font-medium text-sm">Link Talent Protocol</span>
              </div>
              <p className="text-gray-500 text-xs mb-3">
                Enter your passport ID to link your builder score on-chain.{" "}
                <a href="https://talentprotocol.com" target="_blank" rel="noreferrer"
                   className="text-rose-400 underline">Get yours</a>
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={talentManualId}
                  onChange={(e) => setTalentManualId(e.target.value)}
                  placeholder="e.g. 12345"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2
                             text-white text-sm placeholder-gray-600 focus:outline-none
                             focus:border-rose-500 transition"
                />
                <button
                  onClick={handleLinkTalent}
                  disabled={!talentManualId.trim() || talentPending || talentLinking}
                  className="px-4 py-2 bg-rose-500 rounded-xl text-white text-sm font-medium
                             disabled:opacity-40 transition"
                >
                  {talentPending || talentLinking
                    ? <Loader2 size={14} className="animate-spin" />
                    : "Link"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Self Protocol verification ── */}
      {hasProfile && !isVerified && (
        <div className="mx-5 mb-4">
          <button
            onClick={() => setShowSelfModal(true)}
            className="flex items-center justify-between w-full bg-gray-800 rounded-2xl px-4 py-4
                       hover:bg-gray-700 transition"
          >
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="text-blue-400 mt-0.5 shrink-0" />
              <div className="text-left">
                <span className="text-gray-300 text-sm block">Verify with Self Protocol</span>
                <span className="text-gray-600 text-xs">Prove you&apos;re 18+ — adds a verified badge</span>
              </div>
            </div>
            <span className="text-gray-600 text-xs shrink-0 ml-2">ZK proof</span>
          </button>
        </div>
      )}

      {/* ── CeloScan link ── */}
      <div className="mx-5 mb-4">
        <a
          href={`https://sepolia.celoscan.io/address/${address}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between w-full bg-gray-800 rounded-2xl px-4 py-4
                     hover:bg-gray-700 transition"
        >
          <span className="text-gray-300 text-sm">View on CeloScan</span>
          <ExternalLink size={16} className="text-gray-500" />
        </a>
      </div>

      <BottomNav />

      {/* ── Modals ── */}
      {showEditSheet && dbProfile && (
        <EditSheet
          profile={dbProfile}
          address={address}
          onSave={(updated) => {
            setDbProfile(updated);
            setShowEditSheet(false);
          }}
          onClose={() => setShowEditSheet(false)}
        />
      )}

      {showSelfModal && (
        <SelfVerificationModal
          onClose={() => setShowSelfModal(false)}
          onVerified={() => {
            setShowSelfModal(false);
            refetch();
            loadProfile();
          }}
        />
      )}
    </div>
  );
}
