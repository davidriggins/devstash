import Link from "next/link";
import { Layers } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Shared shell for the sign-in and register pages. These sit outside the
 * dashboard layout — no sidebar, no top bar — so they carry their own logo.
 */

interface AuthCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <Link href="/" className="flex items-center gap-3 text-foreground">
        <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-500 text-white">
          <Layers className="size-5" />
        </span>
        <span className="text-xl font-semibold tracking-tight">DevStash</span>
      </Link>

      <Card className="w-full max-w-sm [--card-spacing:--spacing(5)]">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">{footer}</p>
    </div>
  );
}
