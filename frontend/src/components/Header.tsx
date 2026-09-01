import { useState } from "react";
import type { WalletProvider } from "../lib/walletProviders";
import { IconCheck, IconCopy, IconFormline, IconSpinner, IconWallet } from "./Icons";

interface HeaderProps {
  wallets: WalletProvider[];
  selectedWallet: WalletProvider | null;
  onSelectWallet: (wallet: WalletProvider | null) => void;
  address: string;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting: boolean;
  caseCount: string;
}

export function Header({
  wallets,
  selectedWallet,
  onSelectWallet,
  address,
  onConnect,
  onDisconnect,
  isConnecting,
  caseCount,
}: HeaderProps) {
  const [copied, setCopied] = useState(false);

  const formattedAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : "";

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard write failed */
    }
  };

  return (
    <header className="top-header">
      <div className="header-inner">
        {/* Brand identity */}
        <div className="brand-group">
          <div className="brand-icon">
            <IconFormline />
          </div>
          <div className="brand-text">
            <div className="brand-title-row">
              <span className="brand-name">FORM / LINE</span>
              <span className="brand-badge">GOVTECH CONSENSUS</span>
            </div>
            <span className="brand-subtitle">
              Public Benefits Form Revision & Requirement Register
            </span>
          </div>
        </div>

        {/* System metrics & Wallet Control */}
        <div className="header-controls">
          {/* Network pill */}
          <div className="status-pill network-pill" title="Connected to GenLayer Studionet">
            <span className="pulse-indicator" />
            <span className="network-name">GenLayer Studionet</span>
          </div>

          {/* Case counter pill */}
          <div className="status-pill case-counter-pill" title="Total registered form cases">
            <span className="metric-label">Registry</span>
            <span className="metric-value">{caseCount === "—" ? "—" : `${caseCount} cases`}</span>
          </div>

          {/* Wallet Control Room */}
          <div className="wallet-control-card" aria-label="Wallet control room">
            {address ? (
              <div className="wallet-connected-group">
                <div className="wallet-meta">
                  <span className="wallet-status-dot online" />
                  <span className="wallet-provider-name">
                    {selectedWallet?.info.name || "Wallet"}
                  </span>
                  <button
                    type="button"
                    className="address-chip"
                    onClick={copyAddress}
                    title="Click to copy full address"
                  >
                    <code>{formattedAddress}</code>
                    {copied ? <IconCheck className="icon-success" /> : <IconCopy />}
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-disconnect"
                  onClick={onDisconnect}
                  title="Disconnect current wallet"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="wallet-connect-group">
                <div className="provider-select-wrapper">
                  <select
                    className="provider-select"
                    aria-label="Wallet provider selector"
                    value={selectedWallet?.info.uuid || ""}
                    onChange={(e) => {
                      const found = wallets.find((w) => w.info.uuid === e.target.value) || null;
                      onSelectWallet(found);
                    }}
                  >
                    <option value="">Choose a wallet</option>
                    {wallets.map((w) => (
                      <option key={w.info.uuid} value={w.info.uuid}>
                        {w.info.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn-connect"
                  onClick={onConnect}
                  disabled={isConnecting || !selectedWallet}
                >
                  {isConnecting ? (
                    <>
                      <IconSpinner /> Connecting…
                    </>
                  ) : (
                    <>
                      <IconWallet /> Connect Signer
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
