import "server-only";

import {
  EMPTY_ANALYTICS,
  type Overview,
  type ScanRecord,
} from "@mail-guard/contracts";
import type { User } from "@supabase/supabase-js";
import { apiFor } from "@/lib/api.server";

export type DashboardData = Overview & {
  scans: ScanRecord[];
  error: string | null;
};

const HISTORY_WINDOW = 60;

/** UC-09: carga perfil, métricas e historial a través del API Gateway. */
export async function loadDashboardData(
  user: User,
  accessToken: string,
): Promise<DashboardData> {
  const api = apiFor(accessToken);
  const [overview, scans] = await Promise.allSettled([
    api.getOverview(),
    api.listScans(HISTORY_WINDOW),
  ]);

  const fallbackProfile = {
    id: user.id,
    displayName: (user.user_metadata?.full_name as string | undefined) ?? null,
    role: null,
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    createdAt: user.created_at,
  };

  return {
    profile:
      overview.status === "fulfilled"
        ? overview.value.profile
        : fallbackProfile,
    analytics:
      overview.status === "fulfilled"
        ? overview.value.analytics
        : EMPTY_ANALYTICS,
    scans: scans.status === "fulfilled" ? scans.value : [],
    error:
      overview.status === "rejected"
        ? overview.reason instanceof Error
          ? overview.reason.message
          : "No pudimos cargar tus métricas."
        : null,
  };
}
