import { act } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Header } from "../components/Header";
import type { WalletProvider } from "../lib/walletProviders";

const address = `0x${"1".repeat(40)}`;
const roots: Array<ReturnType<typeof createRoot>> = [];

function wallet(uuid: string, name: string, rdns: string): WalletProvider {
  return { info: { uuid, name, rdns, icon: `data:image/svg+xml,${uuid}` }, provider: { request: vi.fn() } };
}

function renderHeader(wallets: WalletProvider[], overrides: Partial<ComponentProps<typeof Header>> = {}) {
  const container = document.createElement("div");
  const root = createRoot(container);
  const onConnect = vi.fn();
  document.body.appendChild(container);
  roots.push(root);
  act(() => {
    root.render(
      <div className="app-shell">
        <Header
          wallets={wallets}
          selectedWallet={null}
          onSelectWallet={vi.fn()}
          address=""
          onConnect={onConnect}
          onDisconnect={vi.fn()}
          isConnecting={false}
          connectionError=""
          caseCount="—"
          {...overrides}
        />
      </div>,
    );
  });
  return { container, root, onConnect };
}

afterEach(() => {
  act(() => roots.splice(0).forEach((root) => root.unmount()));
  document.body.replaceChildren();
});

describe("wallet picker", () => {
  it("opens without requesting accounts and lists every available wallet", async () => {
    const wallets = [wallet("meta", "MetaMask", "io.metamask"), wallet("okx", "OKX Wallet", "com.okex.wallet"), wallet("rabby", "Rabby", "io.rabby")];
    const { container } = renderHeader(wallets);
    await act(async () => {
      (container.querySelector("button.btn-connect") as HTMLButtonElement).click();
      await Promise.resolve();
    });

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.querySelectorAll("button.wallet-option")).toHaveLength(3);
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("MetaMask");
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("OKX Wallet");
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Rabby");
    wallets.forEach((item) => expect(item.provider.request as ReturnType<typeof vi.fn>).not.toHaveBeenCalled());
  });

  it("connects only the wallet option explicitly selected by the user", async () => {
    const wallets = [wallet("meta", "MetaMask", "io.metamask"), wallet("okx", "OKX Wallet", "com.okex.wallet")];
    const { container, onConnect } = renderHeader(wallets);
    await act(async () => {
      (container.querySelector("button.btn-connect") as HTMLButtonElement).click();
      await Promise.resolve();
    });
    await act(async () => {
      (document.querySelectorAll("button.wallet-option")[1] as HTMLButtonElement).click();
      await Promise.resolve();
    });

    expect(onConnect).toHaveBeenCalledOnce();
    expect(onConnect.mock.calls[0][0]).toBe(wallets[1]);
    expect((wallets[0].provider.request as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("cancels and closes on Escape without connecting", async () => {
    const onConnect = vi.fn();
    const { container } = renderHeader([wallet("meta", "MetaMask", "io.metamask")], { onConnect });
    const trigger = container.querySelector("button.btn-connect") as HTMLButtonElement;
    await act(async () => {
      trigger.click();
      await Promise.resolve();
    });
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      await Promise.resolve();
    });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(onConnect).not.toHaveBeenCalled();
  });

  it("starts disconnected after reload even when supported wallets are already discovered", () => {
    const { container } = renderHeader([wallet("rabby", "Rabby", "io.rabby")]);
    expect(container.querySelector("button.btn-connect")?.textContent).toContain("Connect wallet");
    expect(container.querySelector('[aria-label="Wallet connection"]')?.textContent).not.toContain(address);
  });
});
