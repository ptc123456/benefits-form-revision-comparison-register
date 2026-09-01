import { useState } from "react";
import { IconAlert, IconCheck, IconCopy, IconExternalLink, IconRefresh, IconSpinner } from "./Icons";

interface NotificationToastProps {
  notice: string;
  error: string;
  busy: string;
  txHash: string;
  pending: boolean;
  onReconcile: () => void;
  onDismiss: () => void;
}

export function NotificationToast({
  notice,
  error,
  busy,
  txHash,
  pending,
  onReconcile,
  onDismiss,
}: NotificationToastProps) {
  const [copiedHash, setCopiedHash] = useState(false);

  if (!notice && !error && !busy) return null;

  const copyHash = async () => {
    if (!txHash) return;
    try {
      await navigator.clipboard.writeText(txHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch {
      /* clipboard write failed */
    }
  };

  const isDanger = Boolean(error);
  const isPending = Boolean(busy);

  return (
    <aside
      className={`notification-toast ${isDanger ? "toast-danger" : isPending ? "toast-pending" : "toast-success"}`}
      role={isDanger ? "alert" : "status"}
      aria-live="polite"
    >
      <div className="toast-content">
        <div className="toast-icon-wrap">
          {isPending ? (
            <IconSpinner className="toast-icon spin" />
          ) : isDanger ? (
            <IconAlert className="toast-icon" />
          ) : (
            <IconCheck className="toast-icon" />
          )}
        </div>

        <div className="toast-body">
          <div className="toast-message">
            {busy ? `${busy} · waiting for GenLayer Studionet finality…` : error || notice}
          </div>

          {txHash && (
            <div className="toast-hash-row">
              <span className="hash-label">Tx Hash:</span>
              <code className="hash-value monospace">
                {`${txHash.slice(0, 10)}…${txHash.slice(-8)}`}
              </code>
              <button
                type="button"
                className="btn-toast-action"
                onClick={copyHash}
                title="Copy full transaction hash"
              >
                {copiedHash ? <IconCheck /> : <IconCopy />}
                <span>{copiedHash ? "Copied" : "Copy"}</span>
              </button>
              <a
                href={`https://explorer-studio.genlayer.com/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="btn-toast-link"
                title="View on GenLayer Studionet Explorer"
              >
                <IconExternalLink />
                <span>Explorer</span>
              </a>
              {pending && !busy && (
                <button
                  type="button"
                  className="btn-toast-reconcile"
                  onClick={onReconcile}
                  title="Reconcile pending transaction status"
                >
                  <IconRefresh />
                  <span>Reconcile</span>
                </button>
              )}
            </div>
          )}
        </div>

        {!busy && (
          <button
            type="button"
            className="btn-toast-close"
            onClick={onDismiss}
            aria-label="Dismiss message"
          >
            ×
          </button>
        )}
      </div>
    </aside>
  );
}
