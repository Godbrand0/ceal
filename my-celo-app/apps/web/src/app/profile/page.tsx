"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  useAccount, useDisconnect, useWriteContract,
  useWaitForTransactionReceipt, useBalance,
} from "wagmi";
import {
  BadgeCheck, Zap, ExternalLink, LogOut, Trophy, Star,
  Loader2, ShieldCheck, Pencil, X, Camera, Github,
  LayoutGrid, Image as ImageIcon,
} from "lucide-react";
import { celo } from "wagmi/chains";
import { BottomNav } from "@/components/BottomNav";
import { SelfVerificationModal } from "@/components/SelfVerificationModal";
import { ReputationCard } from "@/components/ReputationCard";
import { GitHubActivity } from "@/components/GitHubActivity";
import { useProfile, useUpdateMetadata } from "@/hooks/useProfile";
import { useUserMatches } from "@/hooks/useMatches";
import { useMatchNFTs } from "@/hooks/useMatchNFTs";
import { usePremium } from "@/hooks/usePremium";
import {
  getProfile, upsertProfile, updateProfileTalent, updateProfileGithub,
  isGithubUsernameTaken, getMutualMatchCount, type DbProfile,
} from "@/lib/supabase";
import { uploadFileToPinata, uploadJsonToPinata, ipfsToHttp } from "@/lib/ipfs";
import { truncateAddress } from "@/lib/app-utils";
import { CONTRACT_ADDRESSES, ABIS, CUSD_MAINNET } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/AuthGuard";

interface TalentPassport {
  score: number;
  activity_score: number;
  identity_score: number;
  skills_score: number;
  passport_id: number;
}

const GENDERS = ["Man", "Woman", "Non-binary", "Prefer not to say"];

const INTERESTS = [
  "Music", "Travel", "Fitness", "Gaming", "Cooking", "Art",
  "Tech", "Movies", "Reading", "Web3", "Sports", "Photography",
  "Dancing", "Hiking", "Fashion", "Food", "Yoga", "Startups",
];

const ROLES = [
  "Solidity Dev", "Smart Contract Auditor", "DeFi Builder", "NFT Creator",
  "DAO Contributor", "Web3 Founder", "Protocol Engineer", "Crypto Trader",
  "Frontend Dev", "Backend Dev", "Full Stack Dev", "Product Manager",
  "UX Designer", "Data Scientist", "DevOps Engineer", "Mobile Dev",
  "AI/ML Engineer", "Tech Founder", "Content Creator", "Marketer",
];

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
    name:          profile.name ?? "",
    bio:           profile.bio  ?? "",
    city:          profile.city ?? "",
    github:        profile.github_username ?? "",
    gender:        profile.gender ?? "",
    interests:     profile.interests ?? [] as string[],
    role:          profile.role ?? "",
    photo:         null as File | null,
    photoPreview:  profile.photos?.[0] ? ipfsToHttp(profile.photos[0]) : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    if (!form.name.trim() || !form.city.trim()) {
      setError("Name and city are required.");
      return;
    }
    const newGithub = form.github.trim();
    if (newGithub && newGithub !== (profile.github_username ?? "")) {
      const taken = await isGithubUsernameTaken(newGithub, address);
      if (taken) {
        setError("That GitHub username is already linked to another account.");
        return;
      }
    }

    setSaving(true);
    setError("");
    try {
      let photos = profile.photos ?? [];

      if (form.photo) {
        const uri = await uploadFileToPinata(form.photo);
        photos = [uri, ...photos.filter((p) => p !== photos[0])];
      }

      const updated: Partial<DbProfile> & { address: string } = {
        address,
        name:      form.name.trim(),
        bio:       form.bio.trim(),
        city:      form.city.trim(),
        gender:    form.gender || null,
        interests: form.interests,
        role:      form.role || null,
        photos,
        age:       profile.age,
        token_id:  profile.token_id,
        is_verified: profile.is_verified,
        talent_profile_id: profile.talent_profile_id,
        github_username: form.github.trim() || null,
      };
      await upsertProfile(updated);

      if (form.github.trim() !== (profile.github_username ?? "")) {
        await updateProfileGithub(address, form.github.trim());
      }

      try {
        const metadataUri = await uploadJsonToPinata({
          name: form.name.trim(), bio: form.bio.trim(),
          age: profile.age, city: form.city.trim(), photos, address,
        });
        await update(metadataUri);
      } catch {
        // best-effort
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
                      border-t border-gray-700 px-6 pt-6 pb-10 shadow-2xl max-h-[90vh] overflow-y-auto">
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
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setForm((f) => ({ ...f, photo: file, photoPreview: URL.createObjectURL(file) }));
            }}
          />
        </div>

        <div className="space-y-4">
          {[
            { label: "Name", key: "name", placeholder: "Your name" },
            { label: "City", key: "city", placeholder: "Your city" },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-gray-400 mb-1">{label}</label>
              <input
                value={(form as any)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                           text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 text-sm transition"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Bio</label>
            <textarea rows={3} value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                         text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 text-sm transition resize-none"
            />
          </div>
          {/* Gender */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">I am a…</label>
            <div className="grid grid-cols-2 gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, gender: g }))}
                  className={cn(
                    "py-2.5 rounded-xl border text-sm font-medium transition",
                    form.gender === g
                      ? "border-rose-500 bg-rose-500/15 text-white"
                      : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">My interests</label>
              <span className="text-xs text-gray-600">{form.interests.length}/6</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => {
                const selected = form.interests.includes(interest);
                const maxed    = form.interests.length >= 6 && !selected;
                return (
                  <button
                    key={interest}
                    type="button"
                    disabled={maxed}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        interests: selected
                          ? f.interests.filter((i) => i !== interest)
                          : [...f.interests, interest],
                      }))
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition",
                      selected
                        ? "border-rose-500 bg-rose-500/15 text-white"
                        : maxed
                          ? "border-gray-800 bg-gray-900 text-gray-700 cursor-not-allowed"
                          : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                    )}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">My role</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: f.role === r ? "" : r }))}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition",
                    form.role === r
                      ? "border-rose-500 bg-rose-500/15 text-white"
                      : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">GitHub username</label>
            <div className="relative">
              <Github size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={form.github}
                onChange={(e) => setForm((f) => ({ ...f, github: e.target.value }))}
                placeholder="e.g. torvalds"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-3
                           text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 text-sm transition"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-rose-400 text-xs mt-3 bg-rose-500/10 rounded-xl px-4 py-2">{error}</p>}

        <button onClick={handleSave} disabled={saving || isOnchainPending}
          className="w-full mt-6 py-4 rounded-2xl bg-rose-500 hover:bg-rose-600
                     disabled:opacity-50 font-semibold text-white text-sm transition">
          {saving || isOnchainPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Saving…
            </span>
          ) : "Save changes"}
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
  const { matches } = useUserMatches();
  const { isBoosted } = usePremium();
  const { matches: matchNFTs, isLoading: matchNFTsLoading } = useMatchNFTs(address);

  const { data: cusdBalance } = useBalance({
    address,
    token: CUSD_MAINNET,
    chainId: celo.id,
    query: { enabled: !!address },
  });

  const { writeContract, data: talentTxHash, isPending: talentPending } = useWriteContract();
  const { isSuccess: talentTxDone } = useWaitForTransactionReceipt({ hash: talentTxHash });

  const [dbProfile, setDbProfile]           = useState<DbProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [matchCount, setMatchCount]         = useState(0);
  const [showSelfModal, setShowSelfModal]   = useState(false);
  const [showEditSheet, setShowEditSheet]   = useState(false);
  const [talentPassport, setTalentPassport] = useState<TalentPassport | null>(null);
  const [talentLoading, setTalentLoading]   = useState(false);
  const [talentLinking, setTalentLinking]   = useState(false);
  const [talentManualId, setTalentManualId] = useState("");
  const [activeTab, setActiveTab]           = useState<"profile" | "github" | "nfts">("profile");
  const isFirstLoad                         = useRef(true);

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
    setMatchCount(Math.max(count, matches.length));
    setProfileLoading(false);
  }, [address, matches.length]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    if (!address) return;
    setTalentLoading(true);
    fetch(`/api/talent-protocol?wallet=${address}`)
      .then((r) => r.json())
      .then((d) => { if (d.error !== "api_key_not_configured") setTalentPassport(d.passport ?? null); })
      .catch(() => {})
      .finally(() => setTalentLoading(false));
  }, [address]);

  useEffect(() => {
    if (!talentTxDone || !address || !talentPassport) return;
    setTalentLinking(false);
    updateProfileTalent(address, String(talentPassport.passport_id))
      .then(loadProfile).catch(console.error);
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
  const cusdFormatted = cusdBalance ? parseFloat(cusdBalance.formatted).toFixed(2) : null;

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: LayoutGrid },
    { id: "github"  as const, label: "GitHub",  icon: Github },
    { id: "nfts"    as const, label: "NFTs",     icon: ImageIcon },
  ];

  if (!address || profileLoading) {
    return (
      <AuthGuard>
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
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex-1 flex flex-col min-h-screen pb-24">

        {/* Header */}
      <div className="pt-14 px-5 pb-4 flex items-center justify-between border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">Profile</h1>
        <div className="flex items-center gap-3">
          {address && (
            <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700
                             rounded-full px-3 py-1 font-mono">
              {truncateAddress(address)}
            </span>
          )}
          <button onClick={() => disconnect()} className="text-gray-500 hover:text-gray-300 transition p-1">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-4 px-6 pt-8 pb-6">
        <div className="relative">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-800 border-4 border-gray-700 shadow-xl">
            {photo ? (
              <img src={photo} alt={dbProfile?.name ?? ""} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl
                              bg-gradient-to-br from-rose-900/60 to-gray-800">🧑</div>
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
            <h2 className="text-2xl font-bold text-white">{dbProfile?.name ?? truncateAddress(address)}</h2>
            {isVerified && <BadgeCheck size={22} className="text-blue-400" />}
          </div>
          {dbProfile && (
            <p className="text-gray-400 text-sm mt-0.5">
              {dbProfile.age} · {dbProfile.city}
              {dbProfile.gender ? ` · ${dbProfile.gender}` : ""}
            </p>
          )}
          {dbProfile?.role && (
            <span className="mt-1.5 inline-block px-3 py-0.5 rounded-full text-xs font-medium
                             bg-rose-500/20 border border-rose-500/30 text-rose-300">
              {dbProfile.role}
            </span>
          )}
          {dbProfile?.bio && <p className="text-gray-500 text-xs mt-2 max-w-xs leading-relaxed">{dbProfile.bio}</p>}
          {dbProfile?.interests && dbProfile.interests.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3 max-w-xs">
              {dbProfile.interests.map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-gray-800 border border-gray-700 text-gray-300"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => setShowEditSheet(true)}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-gray-800
                     border border-gray-700 text-gray-300 hover:bg-gray-700 text-sm transition">
          <Pencil size={14} />
          Edit profile
        </button>
      </div>

      {/* Stats */}
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

      {/* Tabs */}
      <div className="flex mx-5 mb-5 gap-1 bg-gray-800/60 rounded-2xl p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition",
              activeTab === id ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Profile */}
      {activeTab === "profile" && (
        <div className="px-5 space-y-4">
          {cusdFormatted !== null && (
            <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
              <div>
                <p className="text-gray-400 text-xs mb-0.5">USDm Balance</p>
                <p className="text-white font-bold text-xl">
                  {cusdFormatted} <span className="text-gray-500 text-sm font-normal">USDm</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20
                              flex items-center justify-center text-lg">💵</div>
            </div>
          )}

          {/* Reputation */}
          {address && <ReputationCard address={address} />}

          {/* Talent Protocol */}
          {hasProfile && (
            <div>
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
                    <button onClick={handleLinkTalent} disabled={talentPending || talentLinking}
                      className="text-xs text-rose-400 font-medium disabled:opacity-50">
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
                    <input type="text" value={talentManualId}
                      onChange={(e) => setTalentManualId(e.target.value)}
                      placeholder="e.g. 12345"
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2
                                 text-white text-sm placeholder-gray-600 focus:outline-none
                                 focus:border-rose-500 transition"
                    />
                    <button onClick={handleLinkTalent}
                      disabled={!talentManualId.trim() || talentPending || talentLinking}
                      className="px-4 py-2 bg-rose-500 rounded-xl text-white text-sm font-medium
                                 disabled:opacity-40 transition">
                      {talentPending || talentLinking
                        ? <Loader2 size={14} className="animate-spin" />
                        : "Link"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Self Protocol */}
          {hasProfile && !isVerified && (
            <button onClick={() => setShowSelfModal(true)}
              className="flex items-center justify-between w-full bg-gray-800 rounded-2xl px-4 py-4
                         hover:bg-gray-700 transition">
              <div className="flex items-start gap-3">
                <ShieldCheck size={18} className="text-blue-400 mt-0.5 shrink-0" />
                <div className="text-left">
                  <span className="text-gray-300 text-sm block">Verify with Self Protocol</span>
                  <span className="text-gray-600 text-xs">Prove you&apos;re 18+ — adds a verified badge</span>
                </div>
              </div>
              <span className="text-gray-600 text-xs shrink-0 ml-2">Privacy check</span>
            </button>
          )}

          {/* CeloScan */}
          <a href={`https://celoscan.io/address/${address}`}
            target="_blank" rel="noreferrer"
            className="flex items-center justify-between w-full bg-gray-800 rounded-2xl px-4 py-4
                       hover:bg-gray-700 transition">
            <span className="text-gray-300 text-sm">View on CeloScan</span>
            <ExternalLink size={16} className="text-gray-500" />
          </a>
        </div>
      )}

      {/* Tab: GitHub */}
      {activeTab === "github" && (
        <div className="px-5">
          {dbProfile?.github_username ? (
            <GitHubActivity username={dbProfile.github_username} isOwn />
          ) : (
            <div className="bg-gray-800 rounded-2xl p-8 text-center space-y-3">
              <Github size={36} className="mx-auto text-gray-600" />
              <p className="text-gray-400 text-sm font-medium">No GitHub linked</p>
              <p className="text-gray-600 text-xs">Add your GitHub username in your profile to show your commit history.</p>
              <button onClick={() => setShowEditSheet(true)}
                className="px-5 py-2.5 rounded-xl bg-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-600 transition">
                Edit profile
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: NFTs */}
      {activeTab === "nfts" && (
        <div className="px-5 space-y-4">

          {/* Profile NFT */}
          {hasProfile && tokenId ? (
            <div className="bg-gradient-to-br from-rose-900/30 to-gray-800 border border-rose-500/20 rounded-2xl overflow-hidden">
              {photo && (
                <img src={photo} alt="Profile NFT" className="w-full h-48 object-cover" />
              )}
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                    <Trophy size={20} className="text-rose-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">ProfileNFT #{tokenId.toString()}</p>
                    <p className="text-gray-400 text-xs">{dbProfile?.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: "Standard",     value: "ERC-721" },
                    { label: "Chain",        value: "Celo Sepolia" },
                    { label: "Transferable", value: "No (Soulbound)" },
                    { label: "Verified",     value: isVerified ? "Yes ✓" : "No" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-800/60 rounded-xl px-3 py-2">
                      <p className="text-gray-500">{label}</p>
                      <p className="text-white font-medium mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
                <a
                  href={`https://celoscan.io/token/${CONTRACT_ADDRESSES.profileNFT}?a=${tokenId}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-gray-800 rounded-xl
                             text-gray-300 text-sm hover:bg-gray-700 transition"
                >
                  <ExternalLink size={14} />
                  View on CeloScan
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-2xl p-8 text-center space-y-3">
              <ImageIcon size={36} className="mx-auto text-gray-600" />
              <p className="text-gray-400 text-sm">No profile NFT yet</p>
              <p className="text-gray-600 text-xs">Create your profile to mint your soulbound ProfileNFT.</p>
            </div>
          )}

          {/* Match NFTs */}
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">Match NFTs</p>
            {matchNFTsLoading ? (
              <div className="flex items-center gap-3 bg-gray-800 rounded-2xl px-4 py-4">
                <Loader2 size={16} className="text-gray-500 animate-spin" />
                <span className="text-gray-500 text-sm">Loading match NFTs…</span>
              </div>
            ) : matchNFTs.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-6 text-center space-y-2">
                <p className="text-gray-500 text-sm">No match NFTs yet</p>
                <p className="text-gray-600 text-xs">Match with someone to mint a shared MatchNFT on-chain.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matchNFTs.map((m) => {
                  const matchedDate = new Date(Number(m.matchedAt) * 1000).toLocaleDateString(undefined, {
                    month: "short", day: "numeric", year: "numeric",
                  });
                  return (
                    <div key={m.matchId.toString()}
                      className="bg-gradient-to-br from-indigo-900/30 to-gray-800 border border-indigo-500/20 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-lg">
                          💘
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm">MatchNFT #{m.myTokenId.toString()}</p>
                          <p className="text-gray-400 text-xs truncate">Match #{m.matchId.toString()} · {matchedDate}</p>
                        </div>
                        {m.dateCompleted && (
                          <span className="text-[10px] font-medium bg-emerald-500/20 text-emerald-400 rounded-full px-2 py-0.5 border border-emerald-500/20">
                            Date done ✓
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { label: "Partner",        value: m.partnerShort },
                          { label: "Chain",          value: "Celo Sepolia" },
                          { label: "Gifts sent",     value: m.giftsExchanged.toString() },
                          { label: "Transferable",   value: "No (Soulbound)" },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-gray-800/60 rounded-xl px-3 py-2">
                            <p className="text-gray-500">{label}</p>
                            <p className="text-white font-medium mt-0.5">{value}</p>
                          </div>
                        ))}
                      </div>
                      <a
                        href={`https://celoscan.io/token/${CONTRACT_ADDRESSES.matchNFT}?a=${m.myTokenId}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-800 rounded-xl
                                   text-gray-300 text-sm hover:bg-gray-700 transition"
                      >
                        <ExternalLink size={14} />
                        View on CeloScan
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      <BottomNav />

      {showEditSheet && dbProfile && (
        <EditSheet
          profile={dbProfile}
          address={address}
          onSave={(updated) => { setDbProfile(updated); setShowEditSheet(false); }}
          onClose={() => setShowEditSheet(false)}
        />
      )}

      {showSelfModal && (
        <SelfVerificationModal
          onClose={() => setShowSelfModal(false)}
          onVerified={() => { setShowSelfModal(false); refetch(); loadProfile(); }}
        />
        )}
      </div>
    </AuthGuard>
  );
}
