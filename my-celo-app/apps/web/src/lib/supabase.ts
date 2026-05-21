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
  github_username: string | null;
  gender: string | null;
  interests: string[];
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
  media_url: string | null;
  created_at: string;
}

export interface GiftData {
  gift_type: number;
  amount: string;   // human-readable cUSD
  tx_hash: string;
}

export interface DbMatch {
  id: string;
  user1: string;
  user2: string;
  matched_at: string;
  last_message: string | null;
  on_chain_match_id: string | null;
}

export interface DbPledgeEvidence {
  id: string;
  pledge_id: string;
  address: string;
  evidence_type: "confirm_photo" | "cancel_reason";
  content: string;
  ai_verified: boolean;
  ai_confidence: number;
  ai_notes: string;
  created_at: string;
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

export async function updateProfileGithub(address: string, githubUsername: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ github_username: githubUsername })
    .eq("address", address.toLowerCase());
  if (error) throw error;
}

export async function isGithubUsernameTaken(username: string, excludeAddress: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("address")
    .ilike("github_username", username)
    .neq("address", excludeAddress.toLowerCase())
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function recordSwipe(swiper: string, swiped: string, direction: "like" | "pass") {
  const { error } = await supabase.from("swipes").upsert({
    swiper: swiper.toLowerCase(),
    swiped: swiped.toLowerCase(),
    direction,
  }, { onConflict: "swiper,swiped" });
  if (error) throw error;
}

export async function checkMutualLike(addressA: string, addressB: string): Promise<boolean> {
  const { data } = await supabase
    .from("swipes")
    .select("id")
    .eq("swiper", addressB.toLowerCase())
    .eq("swiped", addressA.toLowerCase())
    .eq("direction", "like")
    .maybeSingle();
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
    .not("address", "in", `(${excludeAddresses.join(",")})`)
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
  giftData?: GiftData,
  mediaUrl?: string
) {
  const { error } = await supabase.from("messages").insert({
    match_id: matchId,
    sender: sender.toLowerCase(),
    content,
    gift_data: giftData ?? null,
    media_url: mediaUrl ?? null,
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

export async function createMatch(
  user1: string,
  user2: string,
  onChainMatchId?: string | null,
): Promise<string> {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("matches").insert({
    id,
    user1: user1.toLowerCase(),
    user2: user2.toLowerCase(),
    on_chain_match_id: onChainMatchId ?? null,
  });
  if (error) throw error;
  return id;
}

export async function getMatchesForUser(address: string): Promise<DbMatch[]> {
  const addr = address.toLowerCase();
  const { data } = await supabase
    .from("matches")
    .select("*")
    .or(`user1.eq.${addr},user2.eq.${addr}`)
    .order("matched_at", { ascending: false });
  return data ?? [];
}

export async function getMatchById(id: string): Promise<DbMatch | null> {
  const { data } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .single();
  return data;
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

export async function savePledgeEvidence({
  pledgeId,
  address,
  evidenceType,
  content,
  aiVerified = false,
  aiConfidence = 0,
  aiNotes = "",
}: {
  pledgeId: string;
  address: string;
  evidenceType: "confirm_photo" | "cancel_reason";
  content: string;
  aiVerified?: boolean;
  aiConfidence?: number;
  aiNotes?: string;
}) {
  const { error } = await supabase.from("pledge_evidence").upsert({
    pledge_id: pledgeId,
    address: address.toLowerCase(),
    evidence_type: evidenceType,
    content,
    ai_verified: aiVerified,
    ai_confidence: aiConfidence,
    ai_notes: aiNotes,
  });
  if (error) throw error;
}

export async function getReputationScore(address: string): Promise<{
  score: number;
  confirmedDates: number;
  cancelledDates: number;
  badge: "Trusted" | "Good" | "New" | null;
}> {
  const addr = address.toLowerCase();

  const { data } = await supabase
    .from("pledge_evidence")
    .select("evidence_type, ai_verified")
    .eq("address", addr);

  if (!data || data.length === 0) {
    return { score: 0, confirmedDates: 0, cancelledDates: 0, badge: "New" };
  }

  const confirmedDates = data.filter(
    (r) => r.evidence_type === "confirm_photo" && r.ai_verified
  ).length;
  const cancelledDates = data.filter(
    (r) => r.evidence_type === "cancel_reason"
  ).length;

  const total = confirmedDates + cancelledDates;
  const score = total === 0 ? 0 : Math.round((confirmedDates / total) * 100);

  let badge: "Trusted" | "Good" | "New" | null = null;
  if (total === 0) badge = "New";
  else if (score >= 80) badge = "Trusted";
  else if (score >= 50) badge = "Good";

  return { score, confirmedDates, cancelledDates, badge };
}
