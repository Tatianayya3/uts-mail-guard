"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Download,
  FileJson,
  KeyRound,
  ShieldAlert,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  updateProfileRequestSchema,
  type Profile,
  type ScanRecord,
} from "@mail-guard/contracts";
import { Button, TextField, useZodForm } from "@mail-guard/ui";
import ResetPasswordForm from "@/features/auth/ResetPasswordForm";
import { auth } from "@/lib/supabase/client";
import { deleteHistoryAction, updateProfileAction } from "../actions";
import { downloadCsv, downloadJson } from "../download";

function Section({
  icon,
  title,
  description,
  children,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <section
      className={
        tone === "danger"
          ? "rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-6"
          : "rounded-2xl border border-guard-surface-raised bg-guard-surface-card/60 p-6"
      }
    >
      <div className="mb-5 flex items-start gap-3">
        <span
          className={tone === "danger" ? "text-red-300" : "text-guard-accent"}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-guard-text-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

type Props = {
  email: string;
  profile: Profile;
  scans: ScanRecord[];
  totalScans: number;
};

/** UC-12/UC-13 y ajustes de cuenta. Cada sección hace una sola cosa. */
export default function AccountSettings({
  email,
  profile,
  scans,
  totalScans,
}: Props) {
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const form = useZodForm(updateProfileRequestSchema, {
    displayName: profile.displayName ?? "",
  });

  const saveProfile = form.handleSubmit((values) =>
    startSaving(async () => {
      const result = await updateProfileAction(values);
      (result.ok ? toast.success : toast.error)(result.message);
    }),
  );

  const changePassword = async (values: { password: string }) => {
    setIsChangingPassword(true);
    const { error } = await auth.updatePassword(values.password);
    setIsChangingPassword(false);
    if (error) toast.error(error.message);
    else toast.success("Tu contraseña se actualizó.");
  };

  const deleteHistory = () =>
    startDeleting(async () => {
      const result = await deleteHistoryAction(confirmation);
      (result.ok ? toast.success : toast.error)(result.message);
      if (result.ok) setConfirmation("");
    });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Section
        icon={<UserRound className="h-5 w-5" />}
        title="Perfil"
        description="Así te saludamos en el panel y en la extensión."
      >
        <form
          onSubmit={saveProfile}
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
          noValidate
        >
          <TextField
            label="Nombre visible"
            className="flex-1"
            autoComplete="name"
            disabled={isSaving}
            {...form.field("displayName")}
          />
          <Button type="submit" size="lg" loading={isSaving}>
            Guardar
          </Button>
        </form>
        <p className="mt-4 text-sm text-guard-text-muted">
          Correo: <span className="text-white">{email}</span>
        </p>
      </Section>

      <Section
        icon={<KeyRound className="h-5 w-5" />}
        title="Contraseña"
        description="Elige una contraseña nueva de al menos 8 caracteres."
      >
        <div className="max-w-md">
          <ResetPasswordForm
            isLoading={isChangingPassword}
            onSubmit={changePassword}
            submitLabel="Cambiar contraseña"
          />
        </div>
      </Section>

      <Section
        icon={<Download className="h-5 w-5" />}
        title="Tus datos"
        description="Descarga tus análisis. Solo guardamos el resultado, nunca el texto completo ni los adjuntos del correo."
      >
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => downloadCsv(scans)}
            disabled={scans.length === 0}
            icon={<Download className="h-4 w-4" />}
          >
            Excel (CSV)
          </Button>
          <Button
            variant="secondary"
            onClick={() => downloadJson(scans)}
            disabled={scans.length === 0}
            icon={<FileJson className="h-4 w-4" />}
          >
            JSON completo
          </Button>
        </div>
        {totalScans > scans.length && (
          <p className="mt-3 text-xs text-guard-text-muted">
            Incluye tus últimos {scans.length} análisis.
          </p>
        )}
      </Section>

      <Section
        tone="danger"
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Borrar historial"
        description="Elimina todos tus análisis y métricas. Tu cuenta sigue activa. No se puede deshacer."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <TextField
            label='Escribe "BORRAR" para confirmar'
            className="flex-1"
            value={confirmation}
            onValueChange={setConfirmation}
            disabled={isDeleting || totalScans === 0}
            autoComplete="off"
          />
          <Button
            variant="danger"
            onClick={deleteHistory}
            loading={isDeleting}
            disabled={confirmation.trim().toUpperCase() !== "BORRAR"}
            icon={<Trash2 className="h-4 w-4" />}
          >
            Borrar {totalScans} análisis
          </Button>
        </div>
      </Section>
    </div>
  );
}
