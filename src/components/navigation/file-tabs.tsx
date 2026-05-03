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
    <div className={cn("-mb-px border-b border-stone-200", className)}>
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
                  ? "border-stone-200 border-b-white bg-white text-stone-900"
                  : "border-transparent bg-stone-100/60 text-stone-500 hover:border-stone-200 hover:bg-stone-100 hover:text-stone-800",
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
