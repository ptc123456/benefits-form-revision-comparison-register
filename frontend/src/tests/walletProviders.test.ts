import { describe, expect, it, vi } from "vitest";
import { connectProvider, discoverWalletProviders } from "../lib/walletProviders";

describe("wallet discovery", () => {
  it("requests EIP-6963 announcements and deduplicates by wallet identity", async () => {
    const provider = { request: vi.fn() };
    const announce = new CustomEvent("eip6963:announceProvider", { detail: { provider, info: { uuid: "a", rdns: "io.rabby", name: "Rabby" } } });
    window.addEventListener("eip6963:requestProvider", () => { window.dispatchEvent(announce); window.dispatchEvent(announce); });
    const providers = await discoverWalletProviders(0);
    expect(providers).toHaveLength(1);
    expect(providers[0].info.name).toBe("Rabby");
  });

  it("requests the selected wallet account before checking or switching network", async () => {
    const account = `0x${"2".repeat(40)}`;
    const request = vi.fn(async ({ method }: { method: string }) => method === "eth_requestAccounts" ? [account] : "0xf22f");
    await expect(connectProvider({ info: { uuid: "okx", name: "OKX Wallet", rdns: "com.okex.wallet" }, provider: { request } })).resolves.toBe(account);
    expect(request.mock.calls.map(([args]) => args.method)).toEqual(["eth_requestAccounts", "eth_chainId"]);
  });

  it("turns a rejected wallet request into an actionable user message", async () => {
    const request = vi.fn(async () => { throw { code: 4001, message: "User denied request" }; });
    await expect(connectProvider({ info: { uuid: "meta", name: "MetaMask", rdns: "io.metamask" }, provider: { request } })).rejects.toThrow("Wallet connection was cancelled");
  });
});
