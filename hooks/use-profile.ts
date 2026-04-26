"use client";

import { useEffect, useState } from "react";
import { defaultProfile, type UserProfile } from "@/lib/mock-data";
import { getStoredProfile } from "@/lib/storage";

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);

  useEffect(() => {
    const stored = getStoredProfile();
    if (stored) {
      setProfile(stored);
    }
  }, []);

  return { profile };
}
