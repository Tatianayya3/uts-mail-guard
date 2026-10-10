import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Analytics,
  Profile,
  ScanRecord,
  StoredScan,
} from "@mail-guard/contracts";
import type { Logger } from "@mail-guard/service-kit";
import type {
  AuthenticatedUser,
  ScanRepository,
  UserContextFactory,
} from "../application/ports";

const SCAN_COLUMNS =
  "id, provider, subject, sender_email, sender_domain, sender_display_name, trust_score, verdict, summary, advice, signals, links, model, analyzed_at, created_at, email_hash";

type ScanRow = {
  id: string;
  provider: string;
  subject: string;
  sender_email: string;
  sender_domain: string;
  sender_display_name: string;
  trust_score: number;
  verdict: ScanRecord["verdict"];
  summary: string;
  advice: string;
  signals: ScanRecord["signals"];
  links: ScanRecord["links"];
  model: string;
  analyzed_at: string;
  created_at: string;
  email_hash: string | null;
};

const toRow = (scan: StoredScan) => ({
  provider: scan.provider,
  subject: scan.subject,
  sender_email: scan.sender.email,
  sender_domain: scan.sender.domain,
  sender_display_name: scan.sender.displayName,
  trust_score: scan.trustScore,
  verdict: scan.verdict,
  summary: scan.summary,
  advice: scan.advice,
  signals: scan.signals,
  links: scan.links,
  model: scan.model,
  analyzed_at: scan.analyzedAt,
  email_hash: scan.emailHash ?? null,
});

const toRecord = (row: ScanRow): ScanRecord => ({
  id: row.id,
  provider: row.provider,
  subject: row.subject,
  sender: {
    email: row.sender_email,
    domain: row.sender_domain,
    displayName: row.sender_display_name,
    domainStatus: "unknown",
  },
  trustScore: row.trust_score,
  verdict: row.verdict,
  summary: row.summary,
  advice: row.advice,
  signals: row.signals ?? [],
  links: row.links ?? [],
  model: row.model,
  analyzedAt: new Date(row.analyzed_at).toISOString(),
  createdAt: new Date(row.created_at).toISOString(),
  emailHash: row.email_hash ?? undefined,
});

/**
 * Repositorio sobre Supabase usando el JWT del usuario: Postgres aplica RLS,
 * así que aunque hubiera un error en un filtro, nadie ve datos ajenos.
 */
class SupabaseScanRepository implements ScanRepository {
  constructor(
    private readonly db: SupabaseClient,
    private readonly userId: string,
    private readonly logger: Logger,
  ) {}

  async insertMany(scans: StoredScan[]): Promise<number> {
    const { data, error } = await this.db
      .from("mail_scans")
      .upsert(scans.map(toRow), {
        onConflict: "profile_id,email_hash",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) {
      this.logger.error("scan_insert_failed", {
        message: error.message,
        hint: "¿Ejecutaste supabase/migrations/0001_mail_guard.sql?",
      });
      throw new Error("No se pudo guardar el análisis.");
    }
    return data?.length ?? 0;
  }

  async listRecent(limit: number): Promise<ScanRecord[]> {
    const { data, error } = await this.db
      .from("mail_scans")
      .select(SCAN_COLUMNS)
      .eq("profile_id", this.userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error)
      throw new Error(`No se pudo leer el historial: ${error.message}`);
    return (data as ScanRow[]).map(toRecord);
  }

  async getAnalytics(): Promise<Analytics | null> {
    const { data, error } = await this.db
      .from("profile_analytics")
      .select("*")
      .eq("profile_id", this.userId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      totalScans: data.total_scans,
      safeScans: data.safe_scans,
      suspiciousScans: data.suspicious_scans,
      dangerousScans: data.dangerous_scans,
      unknownScans: data.unknown_scans,
      linksReviewed: data.links_reviewed,
      averageTrustScore: Math.round(Number(data.average_trust_score)),
      lastScannedAt: data.last_scanned_at,
    };
  }

  async getById(id: string): Promise<ScanRecord | null> {
    const { data, error } = await this.db
      .from("mail_scans")
      .select(SCAN_COLUMNS)
      .eq("profile_id", this.userId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`No se pudo leer el análisis: ${error.message}`);
    return data ? toRecord(data as ScanRow) : null;
  }

  async updateProfile(changes: { displayName: string }): Promise<void> {
    const { error } = await this.db
      .from("profiles")
      .update({ display_name: changes.displayName })
      .eq("id", this.userId);
    if (error)
      throw new Error(`No se pudo actualizar el perfil: ${error.message}`);
  }

  async deleteAll(): Promise<number> {
    const { data, error } = await this.db.rpc("delete_my_history");
    if (error) {
      this.logger.error("history_delete_failed", {
        message: error.message,
        hint: "¿Ejecutaste supabase/migrations/0002_privacy_controls.sql?",
      });
      throw new Error("No se pudo borrar el historial.");
    }
    return typeof data === "number" ? data : 0;
  }

  async getProfile(): Promise<Profile | null> {
    const { data, error } = await this.db
      .from("profiles")
      .select("id, role, display_name, avatar_url, created_at")
      .eq("id", this.userId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      role: data.role,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      createdAt: data.created_at,
    };
  }
}

export function createSupabaseUserContext(
  config: { url: string; publishableKey: string },
  logger: Logger,
): UserContextFactory {
  return {
    async fromToken(token) {
      const db = createClient(config.url, config.publishableKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await db.auth.getClaims(token);
      const claims = data?.claims;
      if (error || !claims?.sub) return null;

      const metadata = (claims.user_metadata ?? {}) as Record<string, unknown>;
      const user: AuthenticatedUser = {
        id: claims.sub,
        email: typeof claims.email === "string" ? claims.email : null,
        fullName:
          typeof metadata.full_name === "string" ? metadata.full_name : null,
        avatarUrl:
          typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
        createdAt: null,
      };
      return { user, scans: new SupabaseScanRepository(db, user.id, logger) };
    },
  };
}
