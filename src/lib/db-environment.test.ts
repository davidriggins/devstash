import { afterEach, describe, expect, it } from "vitest";

import { getDatabaseEnvironment } from "@/lib/db-environment";

/**
 * `vitest.setup.ts` clears DATABASE_URL so nothing can reach a database by
 * accident. These tests set it deliberately and put it back afterwards.
 */
function setDatabaseUrl(value: string | undefined) {
  if (value === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = value;
  }
}

afterEach(() => {
  setDatabaseUrl(undefined);
});

const DEV_POOLER =
  "postgresql://user:pw@ep-green-truth-aylaseez-pooler.c-2.us-east-2.aws.neon.tech/neondb";
const DEV_DIRECT =
  "postgresql://user:pw@ep-green-truth-aylaseez.c-2.us-east-2.aws.neon.tech/neondb";
const PROD_POOLER =
  "postgresql://user:pw@ep-damp-frost-ay6iupf5-pooler.c-2.us-east-2.aws.neon.tech/neondb";

describe("getDatabaseEnvironment", () => {
  it("names the development branch from a pooler host", () => {
    setDatabaseUrl(DEV_POOLER);

    expect(getDatabaseEnvironment()).toEqual({
      label: "development",
      endpoint: "ep-green-truth-aylaseez",
      isProduction: false,
    });
  });

  // The -pooler suffix is stripped, so both forms name the same endpoint
  it("names the same branch from a direct host", () => {
    setDatabaseUrl(DEV_DIRECT);

    expect(getDatabaseEnvironment()?.endpoint).toBe("ep-green-truth-aylaseez");
  });

  it("flags the production branch", () => {
    setDatabaseUrl(PROD_POOLER);

    expect(getDatabaseEnvironment()).toEqual({
      label: "production",
      endpoint: "ep-damp-frost-ay6iupf5",
      isProduction: true,
    });
  });

  // Reporting the endpoint id beats guessing a branch name
  it("reports an unrecognised endpoint as itself, and never as production", () => {
    setDatabaseUrl(
      "postgresql://user:pw@ep-unknown-endpoint-1234.us-east-2.aws.neon.tech/neondb"
    );

    expect(getDatabaseEnvironment()).toEqual({
      label: "ep-unknown-endpoint-1234",
      endpoint: "ep-unknown-endpoint-1234",
      isProduction: false,
    });
  });

  it("handles a host with no Neon endpoint", () => {
    setDatabaseUrl("postgresql://user:pw@localhost:5432/devstash");

    // `hostname` excludes the port, so this is "localhost", not "localhost:5432"
    expect(getDatabaseEnvironment()).toEqual({
      label: "localhost",
      endpoint: "localhost",
      isProduction: false,
    });
  });

  // It renders in the layout, so it must never be the thing that crashes it
  it("returns null rather than throwing when the URL is missing or unparseable", () => {
    setDatabaseUrl(undefined);
    expect(getDatabaseEnvironment()).toBeNull();

    setDatabaseUrl("");
    expect(getDatabaseEnvironment()).toBeNull();

    setDatabaseUrl("not a url");
    expect(getDatabaseEnvironment()).toBeNull();
  });

  it("never returns the credentials from the connection string", () => {
    setDatabaseUrl(DEV_POOLER);

    expect(JSON.stringify(getDatabaseEnvironment())).not.toContain("pw");
  });
});
