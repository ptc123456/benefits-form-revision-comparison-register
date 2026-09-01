import type { CaseRecord } from "../lib/contract";
import { IconAlert, IconCheck, IconLock, IconRefresh, IconShield, IconSpinner } from "./Icons";

interface WorkflowCardProps {
  caseId: string;
  onCaseIdChange: (value: string) => void;
  oldRevisionId: string;
  onOldRevisionIdChange: (value: string) => void;
  newRevisionId: string;
  onNewRevisionIdChange: (value: string) => void;
  record: CaseRecord;
  onReadCase: () => void;
  onFreeze: () => void;
  onAssess: () => void;
  onRetry: () => void;
  canWrite: boolean;
  isBusy: boolean;
  walletConnected: boolean;
}

export function WorkflowCard({
  caseId,
  onCaseIdChange,
  oldRevisionId,
  onOldRevisionIdChange,
  newRevisionId,
  onNewRevisionIdChange,
  record,
  onReadCase,
  onFreeze,
  onAssess,
  onRetry,
  canWrite,
  isBusy,
  walletConnected,
}: WorkflowCardProps) {
  const currentState = record.state || (caseId ? "UNFETCHED" : "EMPTY");

  const isDraft = record.state === "DRAFT";
  const isFrozen = record.state === "FROZEN";
  const isAssessed = record.state === "ASSESSED";
  const isUnresolved = record.state === "UNRESOLVED";

  // Freeze validation
  const canFreeze =
    canWrite &&
    Boolean(caseId) &&
    Boolean(oldRevisionId.trim()) &&
    Boolean(newRevisionId.trim()) &&
    oldRevisionId.trim() !== newRevisionId.trim() &&
    (isDraft || !record.state);

  // Assess validation
  const canAssess = canWrite && Boolean(caseId) && isFrozen;

  // Retry validation
  const retryCount = record.retry_count || 0;
  const canRetry =
    canWrite &&
    Boolean(caseId) &&
    (isUnresolved || isFrozen) &&
    retryCount < 3;

  return (
    <article className="workflow-card journey-card">
      <div className="card-header">
        <div className="card-title-group">
          <span className="step-badge">STAGE 02</span>
          <h2 className="card-title">Advance & Assess Case</h2>
        </div>
        <div className={`case-state-badge state-${currentState.toLowerCase()}`}>
          <span className="state-dot" />
          <span>{record.state ? record.state : caseId ? "Case Loaded" : "No Case Loaded"}</span>
        </div>
      </div>

      <p className="card-description">
        Lock the expected schema revision IDs on-chain, then trigger multi-validator non-deterministic
        web evaluation to resolve changes.
      </p>

      {/* Case Lookup Input Bar */}
      <div className="case-lookup-bar">
        <div className="lookup-field">
          <label htmlFor="case-id-input" className="field-label">
            Case Identifier
          </label>
          <div className="input-with-action">
            <input
              id="case-id-input"
              type="text"
              className="text-input monospace"
              value={caseId}
              onChange={(e) => onCaseIdChange(e.target.value)}
              placeholder="case-0123456789abcdef..."
            />
            <button
              type="button"
              className="btn-lookup"
              disabled={!caseId || Boolean(isBusy)}
              onClick={onReadCase}
              title="Query contract state for this case ID"
            >
              {isBusy ? <IconSpinner /> : <IconRefresh />}
              <span>Read State</span>
            </button>
          </div>
        </div>
      </div>

      {/* Revision Identity Lock Inputs */}
      <div className="revision-inputs-grid">
        <div className="field-group">
          <label htmlFor="old-rev-input" className="field-label">
            Frozen Old Revision ID
            <span className="field-required">*</span>
          </label>
          <input
            id="old-rev-input"
            type="text"
            className="text-input monospace"
            value={oldRevisionId}
            onChange={(e) => onOldRevisionIdChange(e.target.value)}
            placeholder="e.g. r1 or 2025-v1"
            disabled={isFrozen || isAssessed}
          />
          <span className="field-hint">Declared revision in old form JSON.</span>
        </div>

        <div className="field-group">
          <label htmlFor="new-rev-input" className="field-label">
            Frozen New Revision ID
            <span className="field-required">*</span>
          </label>
          <input
            id="new-rev-input"
            type="text"
            className="text-input monospace"
            value={newRevisionId}
            onChange={(e) => onNewRevisionIdChange(e.target.value)}
            placeholder="e.g. r2 or 2026-v1"
            disabled={isFrozen || isAssessed}
          />
          <span className="field-hint">Declared revision in new form JSON.</span>
        </div>
      </div>

      {/* Visual State Progression Timeline */}
      <div className="state-timeline" role="region" aria-label="Case Lifecycle Tracker">
        <div
          className={`timeline-node ${
            isDraft || isFrozen || isAssessed || isUnresolved ? "node-passed" : ""
          } ${isDraft ? "node-current" : ""}`}
        >
          <div className="node-icon">
            <IconCheck />
          </div>
          <div className="node-label">
            <strong>01 · Draft</strong>
            <span>Case Created</span>
          </div>
        </div>

        <div className="timeline-connector" />

        <div
          className={`timeline-node ${
            isFrozen || isAssessed || isUnresolved ? "node-passed" : ""
          } ${isFrozen ? "node-current" : ""}`}
        >
          <div className="node-icon">
            <IconLock />
          </div>
          <div className="node-label">
            <strong>02 · Frozen</strong>
            <span>Revisions Locked</span>
          </div>
        </div>

        <div className="timeline-connector" />

        <div
          className={`timeline-node ${
            isAssessed ? "node-passed node-success" : isUnresolved ? "node-alert" : ""
          }`}
        >
          <div className="node-icon">
            <IconShield />
          </div>
          <div className="node-label">
            <strong>03 · {isUnresolved ? "Unresolved" : "Assessed"}</strong>
            <span>{isAssessed ? "Consensus Final" : isUnresolved ? "Requires Retry" : "Awaiting Consensus"}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons with Clear Statuses */}
      <div className="workflow-actions-grid">
        <div className="action-button-block">
          <button
            type="button"
            className="btn-secondary btn-action"
            disabled={!canFreeze}
            onClick={onFreeze}
          >
            <IconLock />
            <span>Freeze Revisions</span>
          </button>
          <span className="action-hint">
            {isFrozen || isAssessed
              ? "Revisions already locked"
              : !caseId
              ? "Enter or register a Case ID first"
              : !oldRevisionId || !newRevisionId
              ? "Enter both revision IDs"
              : "Lock revision IDs to prevent tampering"}
          </span>
        </div>

        <div className="action-button-block">
          <button
            type="button"
            className="btn-primary btn-action"
            disabled={!canAssess}
            onClick={onAssess}
          >
            <IconShield />
            <span>Assess Sources</span>
          </button>
          <span className="action-hint">
            {!isFrozen
              ? "Requires case in FROZEN state"
              : "Triggers multi-validator web retrieval"}
          </span>
        </div>

        <div className="action-button-block">
          <button
            type="button"
            className="btn-secondary btn-action"
            disabled={!canRetry}
            onClick={onRetry}
          >
            <IconRefresh />
            <span>Retry Unresolved ({retryCount}/3)</span>
          </button>
          <span className="action-hint">
            {retryCount >= 3
              ? "Max retry limit reached (3/3)"
              : !isUnresolved && !isFrozen
              ? "Only for UNRESOLVED or FROZEN cases"
              : `Retry assessment (${3 - retryCount} remaining)`}
          </span>
        </div>
      </div>

      {!walletConnected && (
        <div className="field-validation-notice">
          <IconAlert className="validation-icon" />
          <span>Connect your authorized wallet to execute state transitions on Studionet.</span>
        </div>
      )}
    </article>
  );
}
