"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function ClickableRow({
  href,
  className,
  children,
  ...props
}: React.ComponentProps<typeof TableRow> & { href: string }) {
  const router = useRouter();

  return (
    <TableRow
      className={cn("cursor-pointer", className)}
      onClick={(e) => {
        // Don't navigate if clicking a link, button, or checkbox inside the row
        const target = e.target as HTMLElement;
        if (target.closest("a, button, [role=checkbox], input")) return;
        router.push(href);
      }}
      {...props}
    >
      {children}
    </TableRow>
  );
}
