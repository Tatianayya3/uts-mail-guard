import type {
  Analytics,
  Profile,
  ScanRecord,
  StoredScan,
} from "@mail-guard/contracts";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
};

/** Repositorio con alcance de un usuario: nunca puede leer datos de otro. */
export interface ScanRepository {
  /** Inserta ignorando duplicados (mismo usuario + misma huella). Devuelve cuántos se guardaron. */
  insertMany(scans: StoredScan[]): Promise<number>;
  listRecent(limit: number): Promise<ScanRecord[]>;
  getAnalytics(): Promise<Analytics | null>;
  getProfile(): Promise<Profile | null>;
  getById(id: string): Promise<ScanRecord | null>;
  updateProfile(changes: { displayName: string }): Promise<void>;
  /** Borra todo el historial y las métricas del usuario. Devuelve cuántos análisis se borraron. */
  deleteAll(): Promise<number>;
}

export interface UserContextFactory {
  /** Verifica el JWT y devuelve el usuario con su repositorio, o null si no es válido. */
  fromToken(
    token: string,
  ): Promise<{ user: AuthenticatedUser; scans: ScanRepository } | null>;
}
