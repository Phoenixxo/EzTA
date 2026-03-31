type BreadcrumbItem = {
  label: string;
  onClick?: () => void;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-2">
          {index > 0 ? <span className="text-zinc-400">/</span> : null}
          {item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className="rounded-none px-2 py-1 text-zinc-600 hover:bg-white hover:text-zinc-900"
            >
              {item.label}
            </button>
          ) : (
            <span className="rounded-none px-2 py-1 text-zinc-800">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
