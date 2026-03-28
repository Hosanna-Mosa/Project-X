interface StatusBadgeProps {
  status: string;
  variant?: "optimal" | "delay" | "transit" | "open" | "settled" | "pending" | "suspended" | "confirmed" | "delivered" | "assigned" | "picking";
}

const variantStyles: Record<string, string> = {
  optimal: "bg-[hsl(var(--badge-optimal))] text-[hsl(var(--badge-optimal-text))]",
  delay: "bg-[hsl(var(--badge-delay))] text-[hsl(var(--badge-delay-text))]",
  transit: "bg-[hsl(var(--badge-transit))] text-[hsl(var(--badge-transit-text))]",
  open: "bg-[hsl(var(--badge-open))] text-[hsl(var(--badge-open-text))]",
  settled: "bg-[hsl(var(--badge-settled))] text-[hsl(var(--badge-settled-text))]",
  pending: "bg-[hsl(var(--badge-pending))] text-[hsl(var(--badge-pending-text))]",
  suspended: "bg-[hsl(var(--badge-suspended))] text-[hsl(var(--badge-suspended-text))]",
  confirmed: "bg-[hsl(var(--badge-transit))] text-[hsl(var(--badge-transit-text))]",
  delivered: "bg-[hsl(var(--badge-settled))] text-[hsl(var(--badge-settled-text))]",
  assigned: "bg-[hsl(var(--badge-open))] text-[hsl(var(--badge-open-text))]",
  picking: "bg-[hsl(var(--badge-open))] text-[hsl(var(--badge-open-text))]",
};

export function StatusBadge({ status, variant = "optimal" }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${variantStyles[variant] || variantStyles.optimal}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
