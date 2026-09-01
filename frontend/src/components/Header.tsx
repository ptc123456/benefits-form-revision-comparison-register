import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { WalletProvider } from "../lib/walletProviders";
import { IconArrowRight, IconCheck, IconCopy, IconFormline, IconSpinner, IconWallet } from "./Icons";

interface HeaderProps {
  wallets: WalletProvider[];
  selectedWallet: WalletProvider | null;
  onSelectWallet: (wallet: WalletProvider | null) => void;
  address: string;
  onConnect: (wallet?: WalletProvider) => void | Promise<void>;
  onDisconnect: () => void;
  isConnecting: boolean;
  connectionError: string;
  caseCount: string;
}

function walletName(wallet: WalletProvider): string {
  const rdns = wallet.info.rdns?.toLowerCase();
  if (rdns === "io.metamask") return "MetaMask";
  if (rdns === "com.okex.wallet") return "OKX Wallet";
  if (rdns === "io.rabby") return "Rabby";
  return wallet.info.uuid === "legacy" ? "Available wallet" : wallet.info.name;
}

function WalletLogo({ wallet }: { wallet: WalletProvider }) {
  return wallet.info.icon ? (
    <img className="wallet-option-icon" src={wallet.info.icon} alt="" aria-hidden="true" />
  ) : (
    <span className="wallet-option-icon wallet-option-icon-fallback" aria-hidden="true"><IconWallet /></span>
  );
}

interface WalletPickerProps {
  open: boolean;
  wallets: WalletProvider[];
  isConnecting: boolean;
  connectionError: string;
  address: string;
  onSelect: (wallet: WalletProvider) => void;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}

function WalletPicker({ open, wallets, isConnecting, connectionError, address, onSelect, onClose, returnFocusRef }: WalletPickerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const app = document.querySelector<HTMLElement>(".app-shell");
    const previous = document.activeElement as HTMLElement | null;
    app?.setAttribute("inert", "");
    setAttempted(false);
    const focusTimer = window.setTimeout(() => (firstOptionRef.current || dialogRef.current)?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), [href], [tabindex]:not([tabindex='-1'])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      app?.removeAttribute("inert");
      (returnFocusRef.current || previous)?.focus();
    };
  }, [open, onClose, returnFocusRef]);

  useEffect(() => {
    if (open && attempted && address && !isConnecting) onClose();
  }, [address, attempted, isConnecting, onClose, open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="wallet-picker-layer">
      <div className="wallet-picker-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isConnecting) onClose(); }}>
        <div className="wallet-picker-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="wallet-picker-title" tabIndex={-1}>
          <div className="wallet-picker-heading">
            <div><p className="wallet-picker-kicker">Wallet connection</p><h2 id="wallet-picker-title">Choose a wallet</h2><p>Select a wallet to continue.</p></div>
            <button className="wallet-picker-close" type="button" onClick={onClose} disabled={isConnecting} aria-label="Close wallet picker">×</button>
          </div>
          {connectionError && attempted && <div className="wallet-picker-error" role="alert">{connectionError}</div>}
          <div className="wallet-option-list">
            {wallets.length ? wallets.map((wallet, index) => (
              <button className="wallet-option" key={wallet.info.uuid} ref={index === 0 ? firstOptionRef : undefined} type="button" disabled={isConnecting} aria-busy={isConnecting} onClick={() => { setAttempted(true); onSelect(wallet); }}>
                <WalletLogo wallet={wallet} />
                <span className="wallet-option-copy"><strong>{walletName(wallet)}</strong><span>Available to connect</span></span>
                {isConnecting ? <IconSpinner className="wallet-option-arrow animate-spin" /> : <IconArrowRight className="wallet-option-arrow" />}
              </button>
            )) : (
              <div className="wallet-empty-state"><span className="wallet-option-icon wallet-option-icon-fallback" aria-hidden="true"><IconWallet /></span><div><strong>No compatible wallet detected</strong><p>Install a supported wallet extension and reload to continue.</p></div></div>
            )}
          </div>
          <button className="wallet-picker-cancel" type="button" onClick={onClose} disabled={isConnecting}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function Header({ wallets, selectedWallet, onSelectWallet, address, onConnect, onDisconnect, isConnecting, connectionError, caseCount }: HeaderProps) {
  const [copied, setCopied] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const formattedAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";
  const closePicker = useCallback(() => setPickerOpen(false), []);

  const copyAddress = async () => {
    if (!address) return;
    try { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard write failed */ }
  };

  const selectWallet = (wallet: WalletProvider) => {
    onSelectWallet(wallet);
    if (address) onDisconnect();
    void onConnect(wallet);
  };

  return <>
    <header className="top-header">
      <div className="header-inner">
        <div className="brand-group"><div className="brand-icon"><IconFormline /></div><div className="brand-text"><div className="brand-title-row"><span className="brand-name">FORM / LINE</span><span className="brand-badge">GOVTECH CONSENSUS</span></div><span className="brand-subtitle">Public Benefits Form Revision &amp; Requirement Register</span></div></div>
        <div className="header-controls">
          <div className="status-pill network-pill" title="Connected to GenLayer Studionet"><span className="pulse-indicator" /><span className="network-name">GenLayer Studionet</span></div>
          <div className="status-pill case-counter-pill" title="Total registered form cases"><span className="metric-label">Registry</span><span className="metric-value">{caseCount === "—" ? "—" : `${caseCount} cases`}</span></div>
          <div className="wallet-control-card" aria-label="Wallet connection">
            {address ? <div className="wallet-connected-group"><div className="wallet-meta"><span className="wallet-status-dot online" /><span className="wallet-provider-name">{selectedWallet ? walletName(selectedWallet) : "Wallet"}</span><button type="button" className="address-chip" onClick={copyAddress} title="Copy wallet address"><code>{formattedAddress}</code>{copied ? <IconCheck className="icon-success" /> : <IconCopy />}</button></div><button type="button" className="btn-change-wallet" onClick={() => setPickerOpen(true)} title="Choose a different wallet">Change wallet</button><button type="button" className="btn-disconnect" onClick={onDisconnect} title="Disconnect wallet">Disconnect</button></div> : <button ref={connectButtonRef} type="button" className="btn-connect" onClick={() => setPickerOpen(true)} disabled={isConnecting}>{isConnecting ? <><IconSpinner className="animate-spin" /> Connecting…</> : <><IconWallet /> Connect wallet</>}</button>}
          </div>
        </div>
      </div>
    </header>
    <WalletPicker open={pickerOpen} wallets={wallets} isConnecting={isConnecting} connectionError={connectionError} address={address} onSelect={selectWallet} onClose={closePicker} returnFocusRef={connectButtonRef} />
  </>;
}
