# Benefits Form Revision Comparison Register — implementation boundary

This build follows `STAGE-1.md` and `STAGE-2.md` Revision 2.

## Minimal technical adaptation

`FormCase` is represented as canonical JSON in `TreeMap[str, str]` rather than as a nested custom storage dataclass. The JSON schema still stores every required Revision 2 field, including separate sorted field and attachment additions/removals, the deadline flag, retry count, and evidence digest. This avoids a version-sensitive nested storage ABI while preserving the product workflow and public readback.

The contract exposes deterministic owner-plus-nonce case IDs. `freeze_case` binds the caller-supplied expected old/new revision IDs; assessment refetches both HTTPS sources inside the current safe `gl.vm.run_nondet` wrapper and fails closed to `SOURCE_REVISION_CHANGED` if either identity changes. Each validator refetches and independently derives the normalized comparison. Consensus compares the outcome, identities, revisions, deadlines, sorted change sets, deadline flag, and canonical evidence digest; transport status and explanatory reason are not used as a false substitute for the consequential decision. A transaction-level disagreement remains `UNDETERMINED` with the case safely `FROZEN`; the network bounds rotations for that transaction, while the contract bounds finalized `retry_unresolved` mutations with `MAX_RETRIES`. The owner is also the disclosed assessor in this MVP.

The frontend verifies the selected provider's current chain and account immediately before every write, performs operation-specific case readback, uses the deterministic case ID instead of global counter discovery, and exposes hash-based pending-transaction reconciliation after reload.

## Source contract shape

Each source must be a JSON object with:

```json
{
  "program_id": "BENEFITS-2026",
  "revision_id": "r2",
  "required_field_ids": ["applicant_name", "income"],
  "required_attachment_ids": ["proof_of_income"],
  "deadline": "2026-12-31"
}
```

Optional labels/layout fields are ignored. Missing, malformed, duplicated, oversized, unavailable, rate-limited, and non-HTTPS source inputs fail closed to `UNRESOLVED`. A `404`/`410` is not treated as proof of a changed requirement.
