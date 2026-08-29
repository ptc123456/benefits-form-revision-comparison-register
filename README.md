# Benefits Form Revision Comparison Register

A GenLayer `PROJECT` that compares two structured benefits-form revisions before a program publisher silently changes the application burden.

The contract freezes the old/new source URLs, program identity, and expected revision IDs, then independently retrieves and normalizes both JSON sources through GenLayer nondeterminism. The stored result keeps separate sorted required-field and required-attachment additions/removals, deadline change, source revisions, and a canonical evidence digest. Each case uses a deterministic owner-plus-nonce identity, and the owner is the disclosed assessor for this MVP.

## Source format

```json
{
  "program_id": "BENEFITS-2026",
  "revision_id": "r2",
  "required_field_ids": ["applicant_name", "income"],
  "required_attachment_ids": ["proof_of_income"],
  "deadline": "2026-12-31"
}
```

## Verification

```powershell
genvm-lint check contracts\benefits_form_revision_register.py --json
gltest tests -q
```

The frontend is a small Vite/React app under `frontend/`. Set `VITE_CONTRACT_ADDRESS` in `frontend/.env` after a real Studionet deployment. The UI requires the expected revision IDs at freeze, checks the selected account/chain immediately before signing, and offers pending-hash reconciliation after a reload. Dependencies are installed from `frontend/package-lock.json`; run `npm test`, `npm run typecheck`, and `npm run build` from `frontend`.

See [`IMPLEMENTATION.md`](IMPLEMENTATION.md) for the technical adaptation and consensus boundary.
