type BreadcrumbItem = {
  label: string;
  onClick?: () => void;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-stone-500">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-2">
          {index > 0 ? <span className="text-stone-400">/</span> : null}
          {item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className="rounded-md px-2 py-1 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            >
              {item.label}
            </button>
          ) : (
            <span className="px-2 py-1 text-stone-800">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
