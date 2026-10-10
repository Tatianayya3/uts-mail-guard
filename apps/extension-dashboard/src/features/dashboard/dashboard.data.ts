import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";
import { ApiError } from "@mail-guard/api-client";
import {
  EMPTY_ANALYTICS,
  type Analytics,
  type Profile,
  type ScanRecord,
} from "@mail-guard/contracts";
import { apiFor } from "@/lib/api.server";
import { requireSession } from "@/lib/supabase/server";

// Máximo que entrega history-service por petición.
export const HISTORY_WINDOW = 100;

const message = (reason: unknown, fallback: string) =>
  reason instanceof Error ? reason.message : fallback;

export type OverviewData = {
  email: string;
  profile: Profile;
  analytics: Analytics;
  error: string | null;
};

/** UC-09: perfil + métricas. Si el gateway falla, la página igual se muestra. */
export const loadOverview = cache(async (): Promise<OverviewData> => {
  const { user, accessToken } = await requireSession();
  const fallbackProfile: Profile = {
    id: user.id,
    displayName: (user.user_metadata?.full_name as string | undefined) ?? null,
    role: null,
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    createdAt: user.created_at,
  };
  try {
    const overview = await apiFor(accessToken).getOverview();
    return { email: user.email ?? "", ...overview, error: null };
  } catch (reason) {
    return {
      email: user.email ?? "",
      profile: fallbackProfile,
      analytics: EMPTY_ANALYTICS,
      error: message(reason, "No pudimos cargar tus métricas."),
    };
  }
});

/** UC-09: historial reciente. */
export const loadScans = cache(
  async (): Promise<{ scans: ScanRecord[]; error: string | null }> => {
    const { accessToken } = await requireSession();
    try {
      return {
        scans: await apiFor(accessToken).listScans(HISTORY_WINDOW),
        error: null,
      };
    } catch (reason) {
      return {
        scans: [],
        error: message(reason, "No pudimos cargar tu historial."),
      };
    }
  },
);

/** UC-10: un análisis; 404 si no existe o no es del usuario. */
export const loadScan = cache(async (id: string): Promise<ScanRecord> => {
  const { accessToken } = await requireSession();
  try {
    return await apiFor(accessToken).getScan(id);
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 404) notFound();
    throw reason;
  }
});
