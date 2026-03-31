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
        "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-none border border-zinc-300 bg-[#f7f7f5] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-zinc-300 bg-linear-to-b from-white to-zinc-100 px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-[13px] font-semibold tracking-[0.08em] text-zinc-800 uppercase">
            {title}
          </h2>
          {subtitle ? <p className="truncate text-xs text-zinc-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}
