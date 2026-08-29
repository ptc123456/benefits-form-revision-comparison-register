import { describe, expect, it, vi } from "vitest";
import { discoverWalletProviders } from "../lib/walletProviders";

describe("wallet discovery", () => {
  it("requests EIP-6963 announcements and deduplicates by wallet identity", async () => {
    const provider = { request: vi.fn() };
    const announce = new CustomEvent("eip6963:announceProvider", { detail: { provider, info: { uuid: "a", rdns: "io.rabby", name: "Rabby" } } });
    window.addEventListener("eip6963:requestProvider", () => { window.dispatchEvent(announce); window.dispatchEvent(announce); });
    const providers = await discoverWalletProviders(0);
    expect(providers).toHaveLength(1);
    expect(providers[0].info.name).toBe("Rabby");
  });
});
