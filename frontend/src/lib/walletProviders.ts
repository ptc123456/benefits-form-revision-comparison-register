export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

export interface WalletProvider {
  info: { uuid: string; name: string; icon?: string; rdns?: string };
  provider: Eip1193Provider;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

const announceEvent = "eip6963:announceProvider";
const requestEvent = "eip6963:requestProvider";
const supportedRdns = new Set(["io.metamask", "com.okex.wallet", "io.rabby"]);
const announced = new Map<string, WalletProvider>();
const providerKeys = new WeakMap<object, string>();
let pageListenerInstalled = false;

function walletError(error: unknown): Error {
  const code = error && typeof error === "object" && "code" in error ? Number((error as { code?: unknown }).code) : undefined;
  if (code === 4001) return new Error("Wallet connection was cancelled. Choose a wallet to try again.");
  if (code === 4900 || code === 4901) return new Error("The wallet is unavailable. Reconnect it and try again.");
  if (error instanceof Error) return error;
  if (typeof error === "string" && error) return new Error(error);
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    return new Error(typeof message === "string" && message ? message : "Wallet request failed. Try again.");
  }
  return new Error("Wallet request failed. Try again.");
}

function installPageListener(): void {
  if (pageListenerInstalled || typeof window === "undefined") return;
  pageListenerInstalled = true;
  window.addEventListener(announceEvent, (event: Event) => {
    const detail = (event as CustomEvent<WalletProvider>).detail;
    const rdns = detail?.info?.rdns?.toLowerCase();
    if (!detail?.provider || !detail.info || !rdns || !supportedRdns.has(rdns)) return;
    const uuid = detail.info.uuid || `${rdns}:${detail.info.name}`;
    const providerObject = detail.provider as object;
    const existingKey = announced.has(uuid) ? uuid : providerKeys.get(providerObject);
    const key = existingKey || uuid;
    announced.set(key, { ...detail, info: { ...detail.info, rdns } });
    providerKeys.set(providerObject, key);
  });
}

export async function discoverWalletProviders(timeoutMs = 250): Promise<WalletProvider[]> {
  if (typeof window === "undefined") return [];
  installPageListener();
  window.dispatchEvent(new Event(requestEvent));
  await new Promise((resolve) => window.setTimeout(resolve, timeoutMs));
  if (announced.size === 0 && window.ethereum) {
    return [{ info: { uuid: "legacy", name: "Browser wallet" }, provider: window.ethereum }];
  }
  return [...announced.values()].sort((a, b) => a.info.name.localeCompare(b.info.name));
}

export async function connectProvider(wallet: WalletProvider): Promise<string> {
  let accounts: unknown;
  try {
    accounts = await wallet.provider.request({ method: "eth_requestAccounts" });
  } catch (error) {
    throw walletError(error);
  }
  const address = Array.isArray(accounts) ? accounts[0] : "";
  if (typeof address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("The selected wallet returned no usable account. Choose a wallet to try again.");
  }

  let chainId: string;
  try {
    chainId = String(await wallet.provider.request({ method: "eth_chainId" })).toLowerCase();
  } catch (error) {
    throw walletError(error);
  }
  if (chainId !== "0xf22f") {
    try {
      await wallet.provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xf22f" }] });
    } catch (error) {
      const code = (error as { code?: number }).code;
      if (code !== 4902) throw walletError(error);
      try {
        await wallet.provider.request({ method: "wallet_addEthereumChain", params: [{
          chainId: "0xf22f", chainName: "GenLayer Studionet", nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
          rpcUrls: ["https://studio.genlayer.com/api"], blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
        }] });
      } catch (addError) {
        throw walletError(addError);
      }
      try {
        await wallet.provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xf22f" }] });
      } catch (retryError) {
        throw walletError(retryError);
      }
    }
  }
  return address;
}
