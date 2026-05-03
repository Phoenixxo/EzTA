import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "../../lib/utils";

type PanelShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
}>;

export function PanelShell({
  title,
  subtitle,
  actions,
  className,
  bodyClassName,
  children,
}: PanelShellProps) {
  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-stone-200 bg-white",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold text-stone-800">
            {title}
          </h2>
          {subtitle ? (
            <p className="truncate text-xs text-stone-500">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </header>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}
