"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline";
}

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
}: EmptyStateProps) {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <div className="rounded-lg border border-border p-3 mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="mt-4 flex items-center gap-3">
          {action &&
            (action.href ? (
              <Button
                size="sm"
                variant={action.variant ?? "default"}
                asChild
              >
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button
                size="sm"
                variant={action.variant ?? "default"}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          {secondaryAction &&
            (secondaryAction.href ? (
              <Button size="sm" variant="outline" asChild>
                <Link href={secondaryAction.href}>
                  {secondaryAction.label}
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            ))}
        </div>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
