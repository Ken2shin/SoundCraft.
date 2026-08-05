"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function BuildIdWatcher() {
  const pathname = usePathname();

  useEffect(() => {
    const currentBuildId = __NEXT_DATA__.buildId;
    const storedBuildId = sessionStorage.getItem("buildId");

    if (storedBuildId && storedBuildId !== currentBuildId) {
      window.location.reload();
      return;
    }

    sessionStorage.setItem("buildId", currentBuildId);
  }, [pathname]);

  return null;
}