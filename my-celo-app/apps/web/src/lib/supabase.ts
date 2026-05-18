import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnon);

// ---------- types ----------

export interface DbProfile {
  address: string;
  name: string;
  bio: string;
  age: number;
  city: string;
  photos: string[];       // IPFS URLs
  token_id: number | null;
  is_verified: boolean;
  talent_profile_id: string | null;
  created_at: string;
}

export interface DbSwipe {
  id: string;
  swiper: string;
  swiped: string;
  direction: "like" | "pass";
  created_at: string;
}

export interface DbMessage {
  id: string;
  match_id: string;
  sender: string;
  content: string;
  gift_data: GiftData | null;
  created_at: string;
}

export interface GiftData {
  gift_type: number;
  amount: string;   // human-readable cUSD
  tx_hash: string;
}

export interface DbMatch {
  id: string;           // matchId (on-chain)
  user1: string;
  user2: string;
  matched_at: string;
  last_message: string | null;
}

// ---------- helpers ----------

export async function getProfile(address: string): Promise<DbProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("address", address.toLowerCase())
    .single();
  return data;
}

export async function upsertProfile(profile: Partial<DbProfile> & { address: string }) {
  const { error } = await supabase.from("profiles").upsert({
    ...profile,
    address: profile.address.toLowerCase(),
  });
  if (error) throw error;
}

export async function recordSwipe(swiper: string, swiped: string, direction: "like" | "pass") {
  const { error } = await supabase.from("swipes").upsert({
    swiper: swiper.toLowerCase(),
    swiped: swiped.toLowerCase(),
    direction,
  });
  if (error) throw error;
}

export async function checkMutualLike(addressA: string, addressB: string): Promise<boolean> {
  const { data } = await supabase
    .from("swipes")
    .select("id")
    .eq("swiper", addressB.toLowerCase())
    .eq("swiped", addressA.toLowerCase())
    .eq("direction", "like")
    .single();
  return !!data;
}

export async function getDiscoverProfiles(
  currentAddress: string,
  limit = 20
): Promise<DbProfile[]> {
  // Get all addresses already swiped
  const { data: swiped } = await supabase
    .from("swipes")
    .select("swiped")
    .eq("swiper", currentAddress.toLowerCase());

  const excludeAddresses = [
    currentAddress.toLowerCase(),
    ...(swiped?.map((s) => s.swiped) ?? []),
  ];

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .not("address", "in", `(${excludeAddresses.map((a) => `"${a}"`).join(",")})`)
    .limit(limit);

  return data ?? [];
}

export async function getMessages(matchId: string): Promise<DbMessage[]> {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export function subscribeToMessages(
  matchId: string,
  onInsert: (msg: DbMessage) => void
) {
  return supabase
    .channel(`messages:${matchId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
      (payload) => onInsert(payload.new as DbMessage)
    )
    .subscribe();
}

export async function sendMessage(
  matchId: string,
  sender: string,
  content: string,
  giftData?: GiftData
) {
  const { error } = await supabase.from("messages").insert({
    match_id: matchId,
    sender: sender.toLowerCase(),
    content,
    gift_data: giftData ?? null,
  });
  if (error) throw error;
}

export async function updateProfileVerified(address: string, verified: boolean) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_verified: verified })
    .eq("address", address.toLowerCase());
  if (error) throw error;
}

export async function updateProfileTalent(address: string, talentProfileId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ talent_profile_id: talentProfileId })
    .eq("address", address.toLowerCase());
  if (error) throw error;
}

export async function getMutualMatchCount(address: string): Promise<number> {
  const addr = address.toLowerCase();
  // addresses that the user liked
  const { data: liked } = await supabase
    .from("swipes")
    .select("swiped")
    .eq("swiper", addr)
    .eq("direction", "like");

  if (!liked?.length) return 0;

  const likedAddresses = liked.map((r) => r.swiped);

  // of those, how many liked the user back
  const { count } = await supabase
    .from("swipes")
    .select("id", { count: "exact", head: true })
    .eq("direction", "like")
    .eq("swiped", addr)
    .in("swiper", likedAddresses);

  return count ?? 0;
}
