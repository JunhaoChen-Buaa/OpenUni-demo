"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredProductMode, getStoredProfile } from "@/lib/storage";

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    const profile = getStoredProfile();
    const mode = getStoredProductMode();
    router.replace(profile ? (mode ? "/discover" : "/entry") : "/onboarding");
  }, [router]);

  return null;
}
