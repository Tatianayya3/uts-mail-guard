import type {
  AdminUser,
  Analytics,
  Profile,
  Role,
  ScanRecord,
  StoredScan,
} from "@mail-guard/contracts";
import type { AlertRepository } from "../agents/sentinel/ports";

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
  fromToken(token: string): Promise<{
    user: AuthenticatedUser;
    scans: ScanRepository;
    /** Alertas del Centinela para este usuario (sin la migración 0006 no hay). */
    alerts?: AlertRepository;
  } | null>;
}

/**
 * Administración de usuarios (clave secreta del servicio). Solo se usa
 * después de comprobar que quien llama es admin.
 */
export interface AdminRepository {
  listUsers(): Promise<AdminUser[]>;
  /** Cambia el rol. Devuelve el usuario actualizado, o null si no existe. */
  setRole(userId: string, role: Role): Promise<AdminUser | null>;
}
