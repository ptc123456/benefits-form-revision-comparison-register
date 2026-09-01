import { useState } from "react";
import { IconAlert, IconArrowRight, IconFileText, IconSpinner } from "./Icons";

interface RegisterCardProps {
  programId: string;
  onProgramIdChange: (value: string) => void;
  oldUrl: string;
  onOldUrlChange: (value: string) => void;
  newUrl: string;
  onNewUrlChange: (value: string) => void;
  onRegister: () => void;
  canWrite: boolean;
  isBusy: boolean;
  walletConnected: boolean;
}

export function RegisterCard({
  programId,
  onProgramIdChange,
  oldUrl,
  onOldUrlChange,
  newUrl,
  onNewUrlChange,
  onRegister,
  canWrite,
  isBusy,
  walletConnected,
}: RegisterCardProps) {
  const [showPresets, setShowPresets] = useState(false);

  // Validation checks
  const isOldValidUrl = oldUrl.startsWith("https://") && !oldUrl.includes(" ");
  const isNewValidUrl = newUrl.startsWith("https://") && !newUrl.includes(" ");
  const areUrlsDistinct = oldUrl !== newUrl;
  const isProgramIdValid = Boolean(programId.trim());

  const isFormComplete =
    isProgramIdValid && isOldValidUrl && isNewValidUrl && areUrlsDistinct;

  const getDisabledReason = (): string | null => {
    if (!walletConnected) return "Connect an authorized signer on GenLayer Studionet";
    if (isBusy) return "A transaction or verification is currently in flight";
    if (!isProgramIdValid) return "Enter a valid program identifier";
    if (!oldUrl || !newUrl) return "Provide both older and newer form revision URLs";
    if (!isOldValidUrl || !isNewValidUrl) return "Both URLs must use HTTPS without spaces";
    if (!areUrlsDistinct) return "Older and newer URLs must be distinct endpoints";
    return null;
  };

  const disabledReason = getDisabledReason();

  const loadPreset = (presetType: "field_added" | "deadline_change" | "attachments") => {
    onProgramIdChange("BENEFITS-2026");
    if (presetType === "field_added") {
      onOldUrlChange("https://httpbin.org/base64/eyJwcm9ncmFtX2lkIjoiQkVORUZJVFMtMjAyNiIsInJldmlzaW9uX2lkIjoiZmllbGRzLXYxIiwicmVxdWlyZWRfZmllbGRfaWRzIjpbIm5hbWUiLCJhZGRyZXNzIl0sInJlcXVpcmVkX2F0dGFjaG1lbnRfaWRzIjpbImlkIl0sImRlYWRsaW5lIjoiTk9ORSJ9");
      onNewUrlChange("https://httpbin.org/base64/eyJwcm9ncmFtX2lkIjoiQkVORUZJVFMtMjAyNiIsInJldmlzaW9uX2lkIjoiZmllbGRzLXYyIiwicmVxdWlyZWRfZmllbGRfaWRzIjpbIm5hbWUiLCJhZGRyZXNzIiwiaW5jb21lIl0sInJlcXVpcmVkX2F0dGFjaG1lbnRfaWRzIjpbImlkIl0sImRlYWRsaW5lIjoiTk9ORSJ9");
    } else if (presetType === "deadline_change") {
      onOldUrlChange("https://httpbin.org/base64/eyJwcm9ncmFtX2lkIjoiQkVORUZJVFMtMjAyNiIsInJldmlzaW9uX2lkIjoiZGVhZGxpbmUtdjEiLCJyZXF1aXJlZF9maWVsZF9pZHMiOlsibmFtZSIsImluY29tZSJdLCJyZXF1aXJlZF9hdHRhY2htZW50X2lkcyI6WyJpZCJdLCJkZWFkbGluZSI6IjIwMjYtMDQtMTUifQ%3D%3D");
      onNewUrlChange("https://httpbin.org/base64/eyJwcm9ncmFtX2lkIjoiQkVORUZJVFMtMjAyNiIsInJldmlzaW9uX2lkIjoiZGVhZGxpbmUtdjIiLCJyZXF1aXJlZF9maWVsZF9pZHMiOlsibmFtZSIsImluY29tZSJdLCJyZXF1aXJlZF9hdHRhY2htZW50X2lkcyI6WyJpZCJdLCJkZWFkbGluZSI6IjIwMjYtMDYtMzAifQ%3D%3D");
    } else {
      onOldUrlChange("https://httpbin.org/base64/eyJwcm9ncmFtX2lkIjoiQkVORUZJVFMtMjAyNiIsInJldmlzaW9uX2lkIjoiYXR0YWNobWVudHMtdjEiLCJyZXF1aXJlZF9maWVsZF9pZHMiOlsibmFtZSIsImluY29tZSJdLCJyZXF1aXJlZF9hdHRhY2htZW50X2lkcyI6WyJpZC1wcm9vZiJdLCJkZWFkbGluZSI6Ik5PTkUifQ%3D%3D");
      onNewUrlChange("https://httpbin.org/base64/eyJwcm9ncmFtX2lkIjoiQkVORUZJVFMtMjAyNiIsInJldmlzaW9uX2lkIjoiYXR0YWNobWVudHMtdjIiLCJyZXF1aXJlZF9maWVsZF9pZHMiOlsibmFtZSIsImluY29tZSJdLCJyZXF1aXJlZF9hdHRhY2htZW50X2lkcyI6WyJpZC1wcm9vZiIsInRheC1yZXR1cm4tMjAyNiJdLCJkZWFkbGluZSI6Ik5PTkUifQ%3D%3D");
    }
  };

  return (
    <article className="workflow-card register-card">
      <div className="card-header">
        <div className="card-title-group">
          <span className="step-badge">STAGE 01</span>
          <h2 className="card-title">Register Form Pair</h2>
        </div>
        <button
          type="button"
          className="btn-preset-toggle"
          onClick={() => setShowPresets(!showPresets)}
        >
          <IconFileText />
          <span>{showPresets ? "Hide Presets" : "Example Presets"}</span>
        </button>
      </div>

      <p className="card-description">
        Initialize a new benefits comparison case. The contract binds this program ID and source
        pair to a deterministic case nonce owned by your signer.
      </p>

      {showPresets && (
        <div className="presets-panel" role="region" aria-label="Example Presets">
          <div className="presets-label">Quick-fill sample schema URLs:</div>
          <div className="presets-buttons">
            <button
              type="button"
              className="preset-btn"
              onClick={() => loadPreset("field_added")}
            >
              Field Addition Example
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => loadPreset("deadline_change")}
            >
              Deadline Shift Example
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => loadPreset("attachments")}
            >
              Attachment Set Example
            </button>
          </div>
        </div>
      )}

      <form
        className="form-group-stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (canWrite && isFormComplete) onRegister();
        }}
      >
        <div className="field-group">
          <label htmlFor="program-id-input" className="field-label">
            Program Identifier
            <span className="field-required">*</span>
          </label>
          <div className="input-wrapper">
            <input
              id="program-id-input"
              type="text"
              className="text-input"
              value={programId}
              onChange={(e) => onProgramIdChange(e.target.value)}
              placeholder="e.g. BENEFITS-2026, MEDICAID-OHIO, SNAP-2026"
              required
            />
          </div>
          <span className="field-hint">
            Must match the <code>program_id</code> declared inside both structured schemas.
          </span>
        </div>

        <div className="field-group">
          <label htmlFor="old-url-input" className="field-label">
            Older Revision HTTPS URL
            <span className="field-required">*</span>
          </label>
          <div className="input-wrapper">
            <input
              id="old-url-input"
              type="url"
              className={`text-input ${oldUrl && !isOldValidUrl ? "input-invalid" : ""}`}
              value={oldUrl}
              onChange={(e) => onOldUrlChange(e.target.value)}
              placeholder="https://agency.gov/schemas/benefits-v1.json"
              required
            />
          </div>
          <span className="field-hint">Baseline form schema containing established requirements.</span>
        </div>

        <div className="field-group">
          <label htmlFor="new-url-input" className="field-label">
            Newer Revision HTTPS URL
            <span className="field-required">*</span>
          </label>
          <div className="input-wrapper">
            <input
              id="new-url-input"
              type="url"
              className={`text-input ${newUrl && !isNewValidUrl ? "input-invalid" : ""}`}
              value={newUrl}
              onChange={(e) => onNewUrlChange(e.target.value)}
              placeholder="https://agency.gov/schemas/benefits-v2.json"
              required
            />
          </div>
          <span className="field-hint">Target revision to compare for added/removed requirements.</span>
        </div>

        {disabledReason && (
          <div className="field-validation-notice">
            <IconAlert className="validation-icon" />
            <span>{disabledReason}</span>
          </div>
        )}

        <div className="action-row">
          <button
            type="submit"
            className="btn-primary btn-submit-case"
            disabled={!canWrite || !isFormComplete}
          >
            {isBusy ? (
              <>
                <IconSpinner />
                <span>Registering on Chain…</span>
              </>
            ) : (
              <>
                <span>Register Form Pair</span>
                <IconArrowRight />
              </>
            )}
          </button>
        </div>
      </form>

      <div className="schema-contract-box">
        <div className="schema-header">
          <span className="schema-title">REQUIRED STRUCTURED JSON SCHEMA</span>
        </div>
        <pre className="schema-code">
{`{
  "program_id": "BENEFITS-2026",
  "revision_id": "r1",
  "required_field_ids": ["ssn", "income", "household_size"],
  "required_attachment_ids": ["tax_return_2025", "id_proof"],
  "deadline": "2026-04-15" // or "NONE"
}`}
        </pre>
      </div>
    </article>
  );
}
