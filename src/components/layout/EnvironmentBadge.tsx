import { Database, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getDatabaseEnvironment } from "@/lib/db-environment";

/**
 * Shows which Neon branch the running app is talking to. A local server
 * pointed at production is the case worth catching, so that one is loud.
 *
 * Server component: `DATABASE_URL` is read here and only the branch label
 * crosses to the client. Renders nothing in a production build.
 */
export function EnvironmentBadge() {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const environment = getDatabaseEnvironment();

  if (!environment) {
    return null;
  }

  const Icon = environment.isProduction ? TriangleAlert : Database;

  return (
    <Badge
      variant={environment.isProduction ? "destructive" : "outline"}
      title={`Database endpoint: ${environment.endpoint}`}
      className="shrink-0 gap-1.5 font-mono tracking-tight uppercase"
    >
      <Icon />
      {environment.label}
    </Badge>
  );
}
