"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Flame, Camera, Loader2, CheckCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { useMintProfile, useProfile } from "@/hooks/useProfile";
import { uploadFileToPinata, uploadJsonToPinata } from "@/lib/ipfs";
import { upsertProfile } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Step = "basics" | "identity" | "minting" | "done";

const GENDERS = ["Man", "Woman", "Non-binary", "Prefer not to say"];

const INTERESTS = [
  "Music", "Travel", "Fitness", "Gaming", "Cooking", "Art",
  "Tech", "Movies", "Reading", "Web3", "Sports", "Photography",
  "Dancing", "Hiking", "Fashion", "Food", "Yoga", "Startups",
];

function ProgressBar({ step }: { step: Step }) {
  const pct = step === "basics" ? 50 : step === "identity" ? 100 : 100;
  return (
    <div className="w-full max-w-xs mx-auto px-6 pt-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-gray-500">
          {step === "basics" ? "Step 1 of 2" : "Step 2 of 2"}
        </span>
        <span className="ml-auto text-xs text-rose-400 font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-rose-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { mint, isPending } = useMintProfile();
  const { hasProfile, isLoadingProfile } = useProfile();

  useEffect(() => {
    if (isLoadingProfile) return;
    if (hasProfile) router.replace("/discover");
  }, [hasProfile, isLoadingProfile, router]);

  const [step, setStep]   = useState<Step>("basics");
  const [error, setError] = useState("");
  const fileRef           = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name:         "",
    age:          "",
    city:         "",
    bio:          "",
    photo:        null as File | null,
    photoPreview: "",
    gender:       "",
    interests:    [] as string[],
  });

  function setField(field: string, value: string | File | null) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleInterest(interest: string) {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter((i) => i !== interest)
        : f.interests.length < 6
          ? [...f.interests, interest]
          : f.interests,
    }));
  }

  async function handleSubmit() {
    setError("");
    if (!address) return;

    try {
      setStep("minting");

      let photoUri = "";
      if (form.photo) {
        photoUri = await uploadFileToPinata(form.photo);
      }

      const metadata = {
        name:      form.name,
        bio:       form.bio,
        age:       Number(form.age),
        city:      form.city,
        gender:    form.gender,
        interests: form.interests,
        photos:    photoUri ? [photoUri] : [],
        address,
      };
      const metadataUri = await uploadJsonToPinata(metadata);

      await mint(metadataUri);

      await upsertProfile({
        address,
        name:      form.name,
        age:       Number(form.age),
        city:      form.city,
        bio:       form.bio,
        gender:    form.gender || null,
        interests: form.interests,
        photos:    photoUri ? [photoUri] : [],
        token_id:  null,
        is_verified: false,
        talent_profile_id: null,
        github_username: null,
      });

      setStep("done");
      setTimeout(() => router.push("/discover"), 2000);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
      setStep("identity");
    }
  }

  if (step === "minting") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 min-h-screen px-6">
        <Loader2 size={48} className="text-rose-400 animate-spin" />
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">Setting up your profile</h2>
          <p className="text-gray-400 text-sm mt-1">Creating your on-chain identity</p>
        </div>
        <div className="w-full max-w-xs space-y-3">
          {[
            "Saving your photo",
            "Uploading your details",
            "Minting your profile",
            "Almost done",
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-gray-400">
              <div className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              {s}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-screen">
        <CheckCircle size={64} className="text-rose-400" />
        <h2 className="text-2xl font-bold text-white">You&apos;re in!</h2>
        <p className="text-gray-400 text-sm">Welcome to CEAL 🔥</p>
      </div>
    );
  }

  /* ── Step 1: Basics ─────────────────────────────────────────── */
  if (step === "basics") {
    const canAdvance = !!form.name && !!form.age && !!form.city;
    return (
      <div className="flex flex-col min-h-screen">
        <ProgressBar step="basics" />

        <div className="pt-6 pb-4 px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame size={24} className="text-rose-400" />
            <span className="text-xl font-bold text-white">CEAL</span>
          </div>
          <h1 className="text-lg font-semibold text-white">Create your profile</h1>
          <p className="text-gray-500 text-xs mt-1">You own this — it lives on-chain</p>
        </div>

        <div className="flex-1 px-6 pb-10 space-y-5">
          {/* Photo */}
          <div
            onClick={() => fileRef.current?.click()}
            className="relative mx-auto w-28 h-28 rounded-full bg-gray-800 border-2 border-dashed
                       border-rose-500/40 flex items-center justify-center cursor-pointer
                       overflow-hidden hover:border-rose-500 transition"
          >
            {form.photoPreview ? (
              <img src={form.photoPreview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-gray-500">
                <Camera size={26} />
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

          {/* Age + City */}
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

          <button
            type="button"
            disabled={!canAdvance}
            onClick={() => setStep("identity")}
            className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50
                       disabled:cursor-not-allowed font-semibold text-white text-base transition
                       flex items-center justify-center gap-2"
          >
            Continue
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  /* ── Step 2: Identity (gender + interests) ──────────────────── */
  return (
    <div className="flex flex-col min-h-screen">
      <ProgressBar step="identity" />

      <div className="pt-6 pb-4 px-6 text-center">
        <h1 className="text-lg font-semibold text-white">A bit more about you</h1>
        <p className="text-gray-500 text-xs mt-1">Helps us find the right people for you</p>
      </div>

      <div className="flex-1 px-6 pb-10 space-y-7">
        {/* Gender */}
        <div>
          <label className="block text-sm text-gray-400 mb-3">I am a…</label>
          <div className="grid grid-cols-2 gap-2">
            {GENDERS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setField("gender", g)}
                className={cn(
                  "py-3 rounded-2xl border text-sm font-medium transition",
                  form.gender === g
                    ? "border-rose-500 bg-rose-500/15 text-white"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm text-gray-400">My interests</label>
            <span className="text-xs text-gray-600">{form.interests.length}/6 selected</span>
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
                  onClick={() => toggleInterest(interest)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium border transition",
                    selected
                      ? "border-rose-500 bg-rose-500/15 text-white"
                      : maxed
                        ? "border-gray-800 bg-gray-900 text-gray-700 cursor-not-allowed"
                        : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                  )}
                >
                  {interest}
                </button>
              );
            })}
          </div>
          <p className="text-gray-600 text-xs mt-2">Pick up to 6</p>
        </div>

        {error && (
          <p className="text-rose-400 text-sm bg-rose-500/10 rounded-xl px-4 py-3">{error}</p>
        )}

        <div className="space-y-3">
          <button
            type="button"
            disabled={isPending || !form.gender}
            onClick={handleSubmit}
            className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50
                       disabled:cursor-not-allowed font-semibold text-white text-base transition"
          >
            {isPending ? "Creating…" : "Create my profile"}
          </button>

          <button
            type="button"
            onClick={() => setStep("basics")}
            className="w-full flex items-center justify-center gap-1 text-gray-500 text-sm hover:text-gray-300 transition"
          >
            <ChevronLeft size={16} /> Back
          </button>
        </div>

        <p className="text-center text-xs text-gray-600">
          Your profile is yours — stored on-chain and never sold.
        </p>
      </div>
    </div>
  );
}
