import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";
import { ApiError } from "@mail-guard/api-client";
import {
  EMPTY_ANALYTICS,
  isAdmin,
  type AdminUser,
  type AgentsOverview,
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

/** Agentes: estado del Centinela, amenazas, alertas propias y bitácora. */
export const loadAgents = cache(
  async (): Promise<{
    agents: AgentsOverview | null;
    error: string | null;
  }> => {
    const { accessToken } = await requireSession();
    try {
      return { agents: await apiFor(accessToken).getAgents(), error: null };
    } catch (reason) {
      return {
        agents: null,
        error: message(reason, "No pudimos cargar el estado de los agentes."),
      };
    }
  },
);

/** ¿La persona en sesión es administradora? (según profiles.role) */
export const loadIsAdmin = cache(async (): Promise<boolean> => {
  const { profile } = await loadOverview();
  return isAdmin(profile);
});

/**
 * Protege una página de administración: a quien no es admin le responde 404,
 * como si la página no existiera. Los servicios vuelven a validar el rol.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await loadIsAdmin())) notFound();
}

/** Admin: todas las personas registradas con su rol. */
export const loadUsers = cache(
  async (): Promise<{ users: AdminUser[]; error: string | null }> => {
    const { accessToken } = await requireSession();
    try {
      return { users: await apiFor(accessToken).listUsers(), error: null };
    } catch (reason) {
      return {
        users: [],
        error: message(reason, "No pudimos cargar la lista de usuarios."),
      };
    }
  },
);
