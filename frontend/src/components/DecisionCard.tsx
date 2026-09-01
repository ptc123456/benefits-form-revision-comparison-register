import { useState } from "react";
import type { CaseRecord } from "../lib/contract";
import { IconAlert, IconArrowRight, IconCheck, IconCopy, IconFileText, IconMinus, IconPlus, IconShield } from "./Icons";

interface DecisionCardProps {
  record: CaseRecord;
}

export function DecisionCard({ record }: DecisionCardProps) {
  const [copiedDigest, setCopiedDigest] = useState(false);
  const [copiedOwner, setCopiedOwner] = useState(false);

  const hasCase = Boolean(record.case_id);
  const outcome = record.outcome || "AWAITING_ASSESSMENT";

  const getOutcomeColorClass = (code: string) => {
    switch (code) {
      case "SAME_REQUIREMENTS":
        return "outcome-same";
      case "REQUIRED_FIELD_ADDED":
        return "outcome-added";
      case "REQUIRED_FIELD_REMOVED":
        return "outcome-removed";
      case "DEADLINE_CHANGED":
        return "outcome-deadline";
      case "MULTIPLE_REQUIREMENT_CHANGES":
        return "outcome-multiple";
      case "FORM_ID_MISMATCH":
        return "outcome-mismatch";
      case "UNRESOLVED":
        return "outcome-unresolved";
      default:
        return "outcome-pending";
    }
  };

  const getOutcomeDescription = (code: string) => {
    switch (code) {
      case "SAME_REQUIREMENTS":
        return "Both revisions maintain identical required fields, required attachments, and deadlines.";
      case "REQUIRED_FIELD_ADDED":
        return "The newer revision introduces one or more mandatory application fields.";
      case "REQUIRED_FIELD_REMOVED":
        return "The newer revision eliminates one or more previously required fields.";
      case "DEADLINE_CHANGED":
        return "The application submission cutoff deadline was modified between revisions.";
      case "MULTIPLE_REQUIREMENT_CHANGES":
        return "Multiple categories of requirements (fields, attachments, deadlines) changed simultaneously.";
      case "FORM_ID_MISMATCH":
        return "Program ID in source schema does not match the case registration identity.";
      case "UNRESOLVED":
        return record.reason
          ? `Consensus unresolved due to: ${record.reason}`
          : "Upstream source could not be verified by consensus validators.";
      default:
        return "Case has not yet completed validator consensus assessment.";
    }
  };

  const copyToClipboard = async (text: string, setFn: (v: boolean) => void) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setFn(true);
      setTimeout(() => setFn(false), 2000);
    } catch {
      /* clipboard write failed */
    }
  };

  return (
    <article className="workflow-card decision-card">
      <div className="card-header">
        <div className="card-title-group">
          <span className="step-badge">STAGE 03</span>
          <h2 className="card-title">Canonical Decision Record</h2>
        </div>
        {hasCase && (
          <div className={`outcome-badge ${getOutcomeColorClass(outcome)}`}>
            <span className="outcome-icon">
              {outcome === "SAME_REQUIREMENTS" ? (
                <IconCheck />
              ) : outcome === "UNRESOLVED" || outcome === "FORM_ID_MISMATCH" ? (
                <IconAlert />
              ) : (
                <IconShield />
              )}
            </span>
            <span className="outcome-text">{outcome}</span>
          </div>
        )}
      </div>

      <p className="card-description">
        Authoritative comparison outcome determined by multi-validator deterministic readback.
        Survives agency audits and applicant disputes.
      </p>

      {hasCase ? (
        <div className="decision-body">
          {/* Outcome Summary Callout */}
          <div className={`outcome-banner ${getOutcomeColorClass(outcome)}`}>
            <div className="banner-title">
              <strong>Consensus Verdict: {outcome}</strong>
            </div>
            <p className="banner-desc">{getOutcomeDescription(outcome)}</p>
          </div>

          {/* Revision Timeline Comparison Bar */}
          <div className="revision-comparison-deck">
            <div className="revision-box old-revision">
              <div className="revision-tag">OLDER REVISION</div>
              <div className="revision-id monospace">
                {record.old_revision_id || record.frozen_old_revision_id || "Unfrozen"}
              </div>
              <div className="revision-deadline">
                <span className="meta-label">Deadline:</span>
                <span className="meta-value monospace">{record.old_deadline || "NONE"}</span>
              </div>
            </div>

            <div className="revision-flow-arrow">
              <IconArrowRight />
              {record.deadline_changed && (
                <span className="deadline-alert-tag">DEADLINE CHANGED</span>
              )}
            </div>

            <div className="revision-box new-revision">
              <div className="revision-tag">NEWER REVISION</div>
              <div className="revision-id monospace">
                {record.new_revision_id || record.frozen_new_revision_id || "Unfrozen"}
              </div>
              <div className="revision-deadline">
                <span className="meta-label">Deadline:</span>
                <span className="meta-value monospace">{record.new_deadline || "NONE"}</span>
              </div>
            </div>
          </div>

          {/* 4-Quadrant Requirement Changes Matrix */}
          <div className="changes-matrix-grid">
            {/* Quadrant 1: Fields Added */}
            <div className="change-quadrant added-quadrant">
              <div className="quadrant-header">
                <div className="quadrant-title">
                  <IconPlus className="icon-added" />
                  <span>Required Fields Added</span>
                </div>
                <span className="quadrant-count">{record.required_fields_added.length}</span>
              </div>
              {record.required_fields_added.length > 0 ? (
                <ul className="item-tag-list">
                  {record.required_fields_added.map((item) => (
                    <li key={item} className="item-tag item-added">
                      <code>{item}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="quadrant-empty">No required fields added</div>
              )}
            </div>

            {/* Quadrant 2: Fields Removed */}
            <div className="change-quadrant removed-quadrant">
              <div className="quadrant-header">
                <div className="quadrant-title">
                  <IconMinus className="icon-removed" />
                  <span>Required Fields Removed</span>
                </div>
                <span className="quadrant-count">{record.required_fields_removed.length}</span>
              </div>
              {record.required_fields_removed.length > 0 ? (
                <ul className="item-tag-list">
                  {record.required_fields_removed.map((item) => (
                    <li key={item} className="item-tag item-removed">
                      <code>{item}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="quadrant-empty">No required fields removed</div>
              )}
            </div>

            {/* Quadrant 3: Attachments Added */}
            <div className="change-quadrant added-quadrant">
              <div className="quadrant-header">
                <div className="quadrant-title">
                  <IconPlus className="icon-added" />
                  <span>Required Attachments Added</span>
                </div>
                <span className="quadrant-count">{record.required_attachments_added.length}</span>
              </div>
              {record.required_attachments_added.length > 0 ? (
                <ul className="item-tag-list">
                  {record.required_attachments_added.map((item) => (
                    <li key={item} className="item-tag item-added">
                      <code>{item}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="quadrant-empty">No required attachments added</div>
              )}
            </div>

            {/* Quadrant 4: Attachments Removed */}
            <div className="change-quadrant removed-quadrant">
              <div className="quadrant-header">
                <div className="quadrant-title">
                  <IconMinus className="icon-removed" />
                  <span>Required Attachments Removed</span>
                </div>
                <span className="quadrant-count">{record.required_attachments_removed.length}</span>
              </div>
              {record.required_attachments_removed.length > 0 ? (
                <ul className="item-tag-list">
                  {record.required_attachments_removed.map((item) => (
                    <li key={item} className="item-tag item-removed">
                      <code>{item}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="quadrant-empty">No required attachments removed</div>
              )}
            </div>
          </div>

          {/* Cryptographic Evidence Digest & Case Metadata */}
          <div className="evidence-panel">
            <div className="evidence-digest-row">
              <div className="digest-info">
                <span className="digest-label">SHA-256 Consensus Evidence Digest</span>
                <code className="digest-hash">
                  {record.evidence_digest || "Digest will compute upon assessment"}
                </code>
              </div>
              {record.evidence_digest && (
                <button
                  type="button"
                  className="btn-copy-digest"
                  onClick={() => copyToClipboard(record.evidence_digest, setCopiedDigest)}
                  title="Copy evidence digest"
                >
                  {copiedDigest ? <IconCheck className="icon-success" /> : <IconCopy />}
                  <span>{copiedDigest ? "Copied" : "Copy"}</span>
                </button>
              )}
            </div>

            <div className="case-meta-grid">
              <div className="meta-card">
                <span className="meta-label">Case Owner</span>
                <button
                  type="button"
                  className="meta-chip-btn"
                  onClick={() => copyToClipboard(record.owner, setCopiedOwner)}
                  title="Click to copy full address"
                >
                  <code>{record.owner ? `${record.owner.slice(0, 8)}…${record.owner.slice(-6)}` : "—"}</code>
                  {copiedOwner ? <IconCheck className="icon-success" /> : <IconCopy />}
                </button>
              </div>

              <div className="meta-card">
                <span className="meta-label">Program ID</span>
                <span className="meta-value monospace">{record.program_id || "—"}</span>
              </div>

              <div className="meta-card">
                <span className="meta-label">Assessment Retries</span>
                <span className="meta-value monospace">{record.retry_count || 0} / 3</span>
              </div>

              <div className="meta-card">
                <span className="meta-label">Upstream HTTP Status</span>
                <span className="meta-value monospace">
                  {record.statuses && Object.keys(record.statuses).length > 0
                    ? `old: ${record.statuses.old ?? "—"}, new: ${record.statuses.new ?? "—"}`
                    : "Not queried"}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state-container">
          <div className="empty-icon-wrap">
            <IconFileText />
          </div>
          <h3 className="empty-title">No Case Record Loaded</h3>
          <p className="empty-description">
            Register a new form revision pair in <strong>Stage 01</strong> or lookup an existing
            case ID in <strong>Stage 02</strong> to inspect the authoritative consensus comparison
            and cryptographic evidence digest.
          </p>
        </div>
      )}
    </article>
  );
}
