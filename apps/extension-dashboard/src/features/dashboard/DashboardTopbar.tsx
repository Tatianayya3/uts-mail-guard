import Image from "next/image";
import SignOutButton from "./SignOutButton";

type DashboardTopbarProps = {
  greetingName: string;
};

export default function DashboardTopbar({
  greetingName,
}: DashboardTopbarProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-guard-surface-raised px-6 py-5 md:px-10">
      <div className="flex items-center gap-3">
        <Image src="/logo.png" alt="" width={36} height={36} />
        <div>
          <p className="text-sm font-bold leading-tight text-white">
            Mail Guard
          </p>
          <p className="text-xs leading-tight text-guard-text-muted">
            Hola, {greetingName}
          </p>
        </div>
      </div>
      <SignOutButton />
    </header>
  );
}
