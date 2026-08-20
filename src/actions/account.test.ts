import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CurrentUser } from "@/lib/db/user";

/**
 * Every module that would open a database connection is mocked. `@/lib/prisma`
 * throws at import time without DATABASE_URL, which `vitest.setup.ts` clears on
 * purpose, so an unmocked import here would fail loudly rather than connect.
 */
vi.mock("@/auth", () => ({ signOut: vi.fn() }));
vi.mock("@/lib/db/user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    item: { deleteMany: vi.fn() },
    itemType: { deleteMany: vi.fn() },
    user: { delete: vi.fn() },
  },
}));

const { signOut } = await import("@/auth");
const { getCurrentUser } = await import("@/lib/db/user");
const { prisma } = await import("@/lib/prisma");
const { deleteAccount } = await import("@/actions/account");

const USER: CurrentUser = {
  id: "user_1",
  name: "Ada",
  email: "ada@example.com",
  image: null,
  createdAt: new Date("2026-01-01"),
  hasPassword: true,
};

function confirmationForm(value: string) {
  const data = new FormData();
  data.set("confirmation", value);

  return data;
}

beforeEach(() => {
  vi.mocked(getCurrentUser).mockReset().mockResolvedValue(USER);
  vi.mocked(prisma.$transaction).mockReset().mockResolvedValue([]);
  vi.mocked(signOut).mockReset();
});

describe("deleteAccount", () => {
  it("refuses when nobody is signed in", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await deleteAccount({}, confirmationForm(USER.email));

    expect(result.error).toBe("You are not signed in");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  /**
   * The typed confirmation reaches the server from a form field, so the client
   * having disabled the button means nothing — the action checks it too.
   */
  it("refuses a confirmation that does not match the account", async () => {
    const result = await deleteAccount(
      {},
      confirmationForm("someone-else@example.com")
    );

    expect(result.error).toBe("Type your email address exactly to confirm");
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("refuses when the confirmation field is missing entirely", async () => {
    const result = await deleteAccount({}, new FormData());

    expect(result.error).toBeTruthy();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("accepts a confirmation that differs only in case or padding", async () => {
    const result = await deleteAccount(
      {},
      confirmationForm("  ADA@Example.com  ")
    );

    expect(result.error).toBeUndefined();
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  /**
   * Items must go before the user's own item types: `Item.itemType` is
   * `onDelete: Restrict`, while a user's custom types cascade away with the
   * user, so deleting the user directly races the cascade against that
   * constraint for anyone owning a custom type with items in it.
   */
  it("deletes items, then the user's own types, then the user, in one transaction", async () => {
    await deleteAccount({}, confirmationForm(USER.email));

    expect(prisma.item.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER.id },
    });
    // Only the user's own types — system types have userId null and are shared
    expect(prisma.itemType.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER.id },
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: USER.id },
    });

    const operations = vi.mocked(prisma.$transaction).mock.calls[0][0];
    expect(operations).toHaveLength(3);
  });

  it("signs the browser out once the account is gone", async () => {
    await deleteAccount({}, confirmationForm(USER.email));

    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/" });
  });

  it("reports a failed delete without signing out", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error("boom"));

    const result = await deleteAccount({}, confirmationForm(USER.email));

    expect(result.error).toBe("Could not delete your account. Try again.");
    expect(signOut).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
