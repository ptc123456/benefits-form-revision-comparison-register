# Benefits Form Revision Comparison Register

A GenLayer `PROJECT` that compares two structured benefits-form revisions before a program publisher silently changes the application burden.

The contract freezes the old/new source URLs, program identity, and expected revision IDs, then independently retrieves and normalizes both JSON sources through GenLayer nondeterminism. The stored result keeps separate sorted required-field and required-attachment additions/removals, deadline change, source revisions, and a canonical evidence digest. Each case uses a deterministic owner-plus-nonce identity, and the owner is the disclosed assessor for this MVP.

## Verified deployment

- Network: GenLayer Studionet, chain `61999`
- Contract: [`0x5E91f54956C62E6EDBEce49feA42282F16A0a962`](https://explorer-studio.genlayer.com/address/0x5E91f54956C62E6EDBEce49feA42282F16A0a962)
- Deployment transaction: [`0xe74a1e9aadad476544a07d005ff498e0d432686df1f9226b44c0d04fb421f856`](https://explorer-studio.genlayer.com/tx/0xe74a1e9aadad476544a07d005ff498e0d432686df1f9226b44c0d04fb421f856)
- Status: `FINALIZED`, execution `SUCCESS`, source readback matches the locked SHA-256 in [`VERIFICATION.md`](VERIFICATION.md)

The verified Studio journey creates a `DRAFT` case, freezes `rev-old-001` and
`rev-new-001`, then assesses the pair as `REQUIRED_FIELD_ADDED` with `income`
added. The complete transaction matrix and authoritative readbacks are recorded
in [`VERIFICATION.md`](VERIFICATION.md).

## Deployment boundary

This MVP is classified `INTENTIONALLY FROZEN`: it has no contract upgrade path. If
a post-deployment defect is found, deploy a new contract from the recorded source
and update the frontend/documentation; do not claim that the old address is
recoverable through an upgrade. The selected Studio account is the deployer
account for this deployment, not an upgrader authority.

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

The frontend is a small Vite/React app under `frontend/`. Set
`VITE_CONTRACT_ADDRESS=0x5E91f54956C62E6EDBEce49feA42282F16A0a962` in
`frontend/.env` for the verified Studionet deployment. The UI requires the
expected revision IDs at freeze, checks the selected account/chain immediately
before signing, and offers pending-hash reconciliation after a reload.
Dependencies are installed from `frontend/package-lock.json`; run `npm test`,
`npm run typecheck`, and `npm run build` from `frontend`.

See [`IMPLEMENTATION.md`](IMPLEMENTATION.md) for the technical adaptation and consensus boundary.
