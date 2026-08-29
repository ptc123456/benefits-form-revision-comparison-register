# Benefits Form Revision Comparison Register — implementation boundary

This build follows `STAGE-1.md` and `STAGE-2.md` Revision 2.

## Minimal technical adaptation

`FormCase` is represented as canonical JSON in `TreeMap[str, str]` rather than as a nested custom storage dataclass. The JSON schema still stores every required Revision 2 field, including separate sorted field and attachment additions/removals, the deadline flag, retry count, and evidence digest. This avoids a version-sensitive nested storage ABI while preserving the product workflow and public readback.

The assessment fetches both frozen HTTPS sources inside `gl.vm.run_nondet_unsafe`. Each validator refetches and independently derives the normalized comparison. Consensus compares the outcome, identities, revisions, deadlines, sorted change sets, deadline flag, and canonical evidence digest; transport status and explanatory reason are not used as a false substitute for the consequential decision.

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
