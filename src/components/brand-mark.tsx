import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-8 w-8", className)}
      viewBox="0 0 40 40"
      fill="none"
    >
      <rect width="40" height="40" rx="11" fill="currentColor" />
      <path
        d="M11 9.5h10.5c5.1 0 8.5 2.5 8.5 6.5 0 2.2-1.1 4-3.1 5.1 2.8 1 4.1 2.8 4.1 5.5 0 5-3.9 8.4-9.8 8.4H11V9.5Z"
        stroke="white"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M16 16h5.2c2.1 0 3.4.8 3.4 2.4 0 1.7-1.3 2.6-3.4 2.6H16m0 5h5.8c2.3 0 3.7-.9 3.7-2.7 0-1.7-1.4-2.6-3.7-2.6H16"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}