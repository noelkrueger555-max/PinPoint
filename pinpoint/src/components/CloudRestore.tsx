"use client";

/**
 * Mounts once in the root layout. Whenever the user becomes signed-in we
 * pull all of their cloud photos into IndexedDB so play works on this
 * device without re-uploading.
 */

import { useEffect, useRef } from "react";
import { isCloudEnabled, onAuthChange, getCurrentUser } from "@/lib/supabase";
import { restoreFromCloud } from "@/lib/cloud-sync";
import { toast } from "@/lib/toast";

export default function CloudRestore() {
  const ranFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isCloudEnabled()) return;
    let cancelled = false;

    const run = async () => {
      const user = await getCurrentUser();
      if (cancelled || !user) return;
      if (ranFor.current === user.id) return;
      ranFor.current = user.id;
      try {
        const result = await restoreFromCloud();
        if (cancelled) return;
        if (result.restored > 0) {
          toast.success(
            `${result.restored} Foto${result.restored === 1 ? "" : "s"} aus der Cloud geladen`
          );
        }
      } catch (err) {
        console.warn("[cloud-restore] failed", err);
      }
    };

    void run();
    const unsub = onAuthChange((signedIn) => {
      if (signedIn) void run();
      else ranFor.current = null;
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return null;
}
