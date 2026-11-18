"use client";

import { useEffect, useState } from "react";
import { signedUrls } from "@/lib/media";

/** Fresh signed URLs for the given photo ids. Re-signs only when the set of ids changes. */
export function usePhotoUrls(ids: string[]): Record<string, string> {
  const key = [...new Set(ids)].sort().join("|");
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!key) return;
    let live = true;
    signedUrls(key.split("|"))
      .then((u) => {
        if (live) setUrls(u);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [key]);
  return urls;
}
