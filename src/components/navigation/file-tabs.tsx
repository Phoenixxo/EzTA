import { cn } from "../../lib/utils";

type FileTabsProps<T extends string> = {
  tabs: readonly T[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  labels?: Partial<Record<T, string>>;
  className?: string;
};

export function FileTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  labels,
  className,
}: FileTabsProps<T>) {
  return (
    <div className={cn("-mb-px border-b border-zinc-300", className)}>
      <div className="flex flex-wrap items-end gap-1">
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={cn(
                "relative border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors",
                isActive
                  ? "border-zinc-300 border-b-[#f7f7f5] bg-[#f7f7f5] text-zinc-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                  : "border-transparent bg-zinc-200/60 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900",
              )}
            >
              {labels?.[tab] ?? tab}
            </button>
          );
        })}
      </div>
    </div>
  );
}
