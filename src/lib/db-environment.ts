/**
 * Names the Neon branch the app is actually connected to.
 *
 * Read from `DATABASE_URL` rather than a separate env var, because a separate
 * var can drift from the real connection — which is exactly the failure this
 * is meant to catch. Only the endpoint id is ever returned; the credentials in
 * the URL stay here.
 */

// Neon endpoint id -> branch name, from `list_branch_computes` on this project
const NEON_ENDPOINT_BRANCHES: Record<string, string> = {
  "ep-green-truth-aylaseez": "development",
  "ep-damp-frost-ay6iupf5": "production",
};

export interface DatabaseEnvironment {
  /** Branch name when the endpoint is known, otherwise the raw endpoint id */
  label: string;
  endpoint: string;
  isProduction: boolean;
}

export function getDatabaseEnvironment(): DatabaseEnvironment | null {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  let hostname: string;

  try {
    hostname = new URL(connectionString).hostname;
  } catch {
    // An unparseable URL is not worth crashing a layout over
    return null;
  }

  // ep-green-truth-aylaseez-pooler.c-5.us-east-2.aws.neon.tech -> ep-green-truth-aylaseez
  const endpoint = hostname.split(".")[0].replace(/-pooler$/, "");

  if (!endpoint) {
    return null;
  }

  // An unrecognised endpoint reports itself rather than guessing a branch
  const label = NEON_ENDPOINT_BRANCHES[endpoint] ?? endpoint;

  return { label, endpoint, isProduction: label === "production" };
}
