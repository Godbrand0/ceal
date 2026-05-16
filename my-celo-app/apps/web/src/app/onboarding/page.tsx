"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Flame, Camera, Loader2, CheckCircle } from "lucide-react";
import { useMintProfile } from "@/hooks/useProfile";
import { uploadFileToPinata, uploadJsonToPinata } from "@/lib/ipfs";
import { upsertProfile } from "@/lib/supabase";

type Step = "form" | "minting" | "done";

export default function OnboardingPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { mint, isPending } = useMintProfile();

  const [step, setStep]   = useState<Step>("form");
  const [error, setError] = useState("");
  const fileRef           = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name:  "",
    age:   "",
    city:  "",
    bio:   "",
    photo: null as File | null,
    photoPreview: "",
  });

  function setField(field: string, value: string | File | null) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!address) return;

    try {
      setStep("minting");

      // 1. Upload photo to IPFS
      let photoUri = "";
      if (form.photo) {
        photoUri = await uploadFileToPinata(form.photo);
      }

      // 2. Build metadata JSON and upload
      const metadata = {
        name:    form.name,
        bio:     form.bio,
        age:     Number(form.age),
        city:    form.city,
        photos:  photoUri ? [photoUri] : [],
        address: address,
      };
      const metadataUri = await uploadJsonToPinata(metadata);

      // 3. Mint ProfileNFT on-chain
      const txHash = await mint(metadataUri);

      // 4. Store off-chain profile in Supabase
      await upsertProfile({
        address,
        name:  form.name,
        age:   Number(form.age),
        city:  form.city,
        bio:   form.bio,
        photos: photoUri ? [photoUri] : [],
        token_id: null,
        is_verified: false,
        talent_profile_id: null,
      });

      setStep("done");
      setTimeout(() => router.replace("/discover"), 1800);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
      setStep("form");
    }
  }

  if (step === "minting") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 min-h-screen px-6">
        <Loader2 size={48} className="text-rose-400 animate-spin" />
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">Minting your profile</h2>
          <p className="text-gray-400 text-sm mt-1">This creates your on-chain identity</p>
        </div>
        <div className="w-full max-w-xs space-y-2">
          {["Uploading photo to IPFS", "Uploading metadata", "Minting ProfileNFT", "Saving profile"].map(
            (s, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-gray-400">
                <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                {s}
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-screen">
        <CheckCircle size={64} className="text-rose-400" />
        <h2 className="text-2xl font-bold text-white">Profile created!</h2>
        <p className="text-gray-400 text-sm">Welcome to CEAL 🔥</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Header */}
      <div className="pt-14 pb-6 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Flame size={28} className="text-rose-400" />
          <span className="text-2xl font-bold text-white">CEAL</span>
        </div>
        <h1 className="text-xl font-semibold text-white">Create your profile</h1>
        <p className="text-gray-400 text-sm mt-1">Your identity will be minted as an NFT</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-6 pb-10 space-y-5">
        {/* Photo picker */}
        <div
          onClick={() => fileRef.current?.click()}
          className="relative mx-auto w-32 h-32 rounded-full bg-gray-800 border-2 border-dashed
                     border-rose-500/40 flex items-center justify-center cursor-pointer
                     overflow-hidden hover:border-rose-500 transition"
        >
          {form.photoPreview ? (
            <img src={form.photoPreview} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-gray-500">
              <Camera size={28} />
              <span className="text-xs">Add photo</span>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setField("photo", file);
              setField("photoPreview", URL.createObjectURL(file));
            }}
          />
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Your first name"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                       text-white placeholder-gray-500 focus:outline-none focus:border-rose-500
                       transition text-sm"
          />
        </div>

        {/* Age + City row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Age</label>
            <input
              required
              type="number"
              min="18"
              max="99"
              value={form.age}
              onChange={(e) => setField("age", e.target.value)}
              placeholder="25"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                         text-white placeholder-gray-500 focus:outline-none focus:border-rose-500
                         transition text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">City</label>
            <input
              required
              value={form.city}
              onChange={(e) => setField("city", e.target.value)}
              placeholder="Lagos"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                         text-white placeholder-gray-500 focus:outline-none focus:border-rose-500
                         transition text-sm"
            />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Bio</label>
          <textarea
            rows={3}
            value={form.bio}
            onChange={(e) => setField("bio", e.target.value)}
            placeholder="Tell people a little about yourself…"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                       text-white placeholder-gray-500 focus:outline-none focus:border-rose-500
                       transition text-sm resize-none"
          />
        </div>

        {error && (
          <p className="text-rose-400 text-sm bg-rose-500/10 rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={isPending || !form.name || !form.age || !form.city}
          className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50
                     disabled:cursor-not-allowed font-semibold text-white text-base transition"
        >
          {isPending ? "Creating…" : "Create profile & mint NFT"}
        </button>

        <p className="text-center text-xs text-gray-500">
          This mints a soulbound NFT to your wallet — it cannot be transferred.
        </p>
      </form>
    </div>
  );
}
