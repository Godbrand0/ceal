"use client";
import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { getMatchesForUser, getMatchById, type DbMatch } from "@/lib/supabase";

export function useUserMatches() {
  const { address } = useAccount();
  const [matches, setMatches] = useState<DbMatch[]>([]);

  const load = useCallback(() => {
    if (!address) return;
    getMatchesForUser(address).then(setMatches);
  }, [address]);

  useEffect(() => { load(); }, [load]);

  return { matches, refetch: load };
}

export function useMatchData(matchId: string | undefined) {
  const [match, setMatch] = useState<DbMatch | null>(null);

  const load = useCallback(() => {
    if (!matchId) return;
    getMatchById(matchId).then(setMatch);
  }, [matchId]);

  useEffect(() => { load(); }, [load]);

  return { match, refetch: load };
}
