import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
};

export default function PageHeader({
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {description && (
          <p
            className="mt-1 text-sm text-guard-text-muted"
            suppressHydrationWarning
          >
            {description}
          </p>
        )}
      </div>
      {actions}
    </div>
  );
}
