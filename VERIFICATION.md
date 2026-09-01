# Verification record

## PRE_DEPLOY package identity

- Checkpoint boundary: PRE_DEPLOY approval was followed by the separately recorded
  Studio deployment and POST_DEPLOY_TEST evidence below. No GitHub push or Vercel
  release is included in this record.
- Exact contract source commit under review: `48a123d49c3dae79dc17a669afed7a43eacfaba9`.
- Exact contract source SHA-256: `5B2A195B900DBCB0027DF3B9674FEC74C2304AF877419EA8C32A37DC5F0566C6`.
- The follow-up evidence-package commit contains verification metadata only; the
  contract source is unchanged from the source commit above. The submission
  envelope must bind this record to the resulting evidence-package commit.
- Selected deployer-only account: `0xeF5D2119416A2f5afa35dCFA209766EFC1BE5902`.
- Network boundary: GenLayer Studionet, chain ID `61999`.

## Draft deployment and recovery manifest

- Classification: `INTENTIONALLY FROZEN`; no upgrade method or upgrader authority.
- Intended network: GenLayer Studionet, chain ID `61999`, RPC
  `https://studio.genlayer.com/api`.
- Constructor arguments: none (`__init__()` takes no arguments).
- Intended deployer account: `0xeF5D2119416A2f5afa35dCFA209766EFC1BE5902`.
- Contract address: `0x5E91f54956C62E6EDBEce49feA42282F16A0a962`.
- Deployment transaction: `0xe74a1e9aadad476544a07d005ff498e0d432686df1f9226b44c0d04fb421f856`.
- Explorer contract: https://explorer-studio.genlayer.com/address/0x5E91f54956C62E6EDBEce49feA42282F16A0a962
- Explorer deployment: https://explorer-studio.genlayer.com/tx/0xe74a1e9aadad476544a07d005ff498e0d432686df1f9226b44c0d04fb421f856
- Exact deployed source commit/hash: must remain `48a123d49c3dae79dc17a669afed7a43eacfaba9` /
  `5B2A195B900DBCB0027DF3B9674FEC74C2304AF877419EA8C32A37DC5F0566C6`.
- Recovery boundary: if the Studio UI resets while chain state and the recorded
  account remain available, import the recorded address and verify it. If the
  account is lost or Studionet resets, deploy a replacement from the recorded
  source and rerun the complete live matrix; the old address is not upgradeable.

## Current local toolchain

- Python 3.13.6
- `genvm-linter` 0.11.0
- `genlayer-test` / `gltest` 0.29.2
- GenVM runner: `v0.3.0-rc7` from `E:\Genlayer-Tools\GenVM`
- Node.js 22.22.2 and npm 12.0.2 are present; frontend packages are installed from `frontend/package-lock.json`

## Exact local results

```text
genvm-lint check contracts\benefits_form_revision_register.py --json
ok=true; contract=BenefitsFormRevisionRegister; methods=7; view_methods=3; write_methods=4

genvm-lint schema contracts\benefits_form_revision_register.py --output artifacts\benefits_form_revision_register.schema.json
schema written successfully

gltest tests -q
12 passed
```

Frontend verification:

```text
cd frontend; npm ls --depth=0
all declared dependencies resolved

npm test -- --run
3 passed

npm run typecheck
tsc --noEmit succeeded

npm run build
vite production build succeeded
```

The frontend dependency installation was explicitly authorized for this task. npm
reported only package/deprecation and local install-script policy warnings; the
test, typecheck, and production build completed successfully.

## Changed-revision closure

- The exact source has 7 methods, 3 views, and 4 writes; the generated schema and
  linter record those same counts.
- `assess` performs no case mutation until `gl.vm.run_nondet` returns a result.
  If the runtime terminates the transaction because leader and validator results
  disagree, chain-level rollback therefore leaves the case `FROZEN`; the
  `retry_unresolved` entry point accepts `FROZEN` and applies `MAX_RETRIES` only
  to finalized retry mutations. Direct Mode regression coverage also verifies
  that a nondeterministic runtime exception leaves the pre-assessment state
  unchanged. Direct Mode's `run_validator()` is used only for validator-boundary
  coverage; it cannot itself produce a network consensus status.
- The frontend treats `UNDETERMINED`, `CANCELED`, and finalized non-success
  execution as failed history, removes the blocking pending journal, and exposes
  the unchanged case for an explicit retry. Reconciliation validates the
  operation-specific post-state: `create_case` -> `DRAFT`, `freeze_case` ->
  `FROZEN`, and `assess`/`retry_unresolved` -> `ASSESSED` or `UNRESOLVED`.
- `frontend/src/tests/contractJournal.test.ts` covers both definitive
  `UNDETERMINED` journal recovery and rejection of a falsely successful `FROZEN`
  readback for `assess`.

The linter reports an informational newer-runner notice. The candidate remains pinned to the locally available, verified `v0.3.0-rc7` runner until a fresh compatibility check is authorized and completed.

## Official documentation consulted

Retrieved at `2026-08-30T04:41:44+07:00` (Asia/Saigon); installed versions are recorded above.

| Version-sensitive claim | Official source | Installed/runtime reconciliation |
|---|---|---|
| Contract structure and first contract workflow | https://docs.genlayer.com/developers/intelligent-contracts/first-intelligent-contract | `genvm-lint check` and schema generation pass for the exact source |
| Wrapped nondeterministic web retrieval and validator boundary | https://docs.genlayer.com/developers/intelligent-contracts/features/non-determinism; https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle; https://docs.genlayer.com/developers/intelligent-contracts/features/error-handling | Direct Mode covers success, unavailable/malformed sources, revision drift, and validator projection; production uses `gl.vm.run_nondet`, while transaction-level disagreement remains an external `UNDETERMINED` outcome handled by frontend retry/reconciliation |
| Storage/public view compatibility | https://docs.genlayer.com/developers/intelligent-contracts/storage | Exact schema exposes 7 methods, 3 views and 4 writes; persistent state is fully typed `TreeMap[str, str]` plus `u256` |
| Layered testing expectations | https://docs.genlayer.com/developers/intelligent-contracts/testing | `gltest` 0.29.2 runs 12 passing tests; current linter/schema also pass |
| GenLayerJS transaction and Studionet configuration | https://docs.genlayer.com/api-references/genlayer-js; https://docs.genlayer.com/developers/networks | `genlayer-js` 1.1.8; frontend uses `studionet`, chain `61999`/`0xf22f`, RPC `https://studio.genlayer.com/api`, and polls the current transaction object before semantic readback |

- https://docs.genlayer.com/developers/intelligent-contracts/first-intelligent-contract
- https://docs.genlayer.com/developers/intelligent-contracts/features/non-determinism
- https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle
- https://docs.genlayer.com/developers/intelligent-contracts/features/error-handling
- https://docs.genlayer.com/developers/intelligent-contracts/storage
- https://docs.genlayer.com/developers/intelligent-contracts/testing
- https://docs.genlayer.com/api-references/genlayer-js
- https://docs.genlayer.com/developers/networks

Studionet values used by the frontend follow the current network documentation: RPC `https://studio.genlayer.com/api`, chain ID `61999`, currency `GEN`.

## PRE_DEPLOY account selection

The accessible Studio account selected for the deployer-only role is
`0xeF5D2119416A2f5afa35dCFA209766EFC1BE5902`. It was selected in the current
Studio session on 2026-08-30 and used for the deployment and live matrix below.

## POST_DEPLOY_TEST live evidence

- Studio: Codex in-app Browser, GenLayer Studionet, chain ID `61999`.
- Deployment source parity: Explorer Contract > Code readback hashes to
  `5B2A195B900DBCB0027DF3B9674FEC74C2304AF877419EA8C32A37DC5F0566C6`, matching
  the exact source commit `48a123d49c3dae79dc17a669afed7a43eacfaba9`.
- Deployment: `0xe74a1e9aadad476544a07d005ff498e0d432686df1f9226b44c0d04fb421f856`;
  `FINALIZED`; execution `SUCCESS`; consensus reached; constructor input `{}`.
- Case used for the matrix: `case-d00283bc4e94c6453ddd02435ac62de64f83184515b3b6a90bf04fedc960f642`.
- Source pair used by `assess`:
  `https://httpbin.org/base64/eyJwcm9ncmFtX2lkIjoiYmVuZWZpdHMtZGVtbyIsInJldmlzaW9uX2lkIjoicmV2LW9sZC0wMDEiLCJyZXF1aXJlZF9maWVsZF9pZHMiOlsibmFtZSIsImFkZHJlc3MiXSwicmVxdWlyZWRfYXR0YWNobWVudF9pZHMiOlsiaWQiXSwiZGVhZGxpbmUiOiJOT05FIn0%3D`
  and
  `https://httpbin.org/base64/eyJwcm9ncmFtX2lkIjoiYmVuZWZpdHMtZGVtbyIsInJldmlzaW9uX2lkIjoicmV2LW5ldy0wMDEiLCJyZXF1aXJlZF9maWVsZF9pZHMiOlsibmFtZSIsImFkZHJlc3MiLCJpbmNvbWUiXSwicmVxdWlyZWRfYXR0YWNobWVudF9pZHMiOlsiaWQiXSwiZGVhZGxpbmUiOiJOT05FIn0%3D`.

| Row | Studio transaction | Expected and observed result | Finalized readback |
|---|---|---|---|
| LIVE-01 | `create_case(benefits-demo, old_url, new_url, e2e-20260830-01)`; `0x1c6634e4127250511fe774f74aeb436c69f53a45073d5b80337dc62994593784` | `FINALIZED`, `SUCCESS`, consensus reached | `state=DRAFT`, owner/assessor=`0xeF5D2119416A2f5afa35dCFA209766EFC1BE5902`, deterministic case ID above |
| LIVE-02 | `freeze_case(case_id, rev-old-001, rev-new-001)`; `0x522d5778f2b68226641cd5050c465392f479776383157b2d4e73404509455df1` | `FINALIZED`, `SUCCESS`, consensus reached | `state=FROZEN`, frozen revisions exactly `rev-old-001` and `rev-new-001` |
| LIVE-03 | `assess(case_id)`; `0x1d92e18c1a4eb413fcfda47fc2ee4f9fb2265db009e81ef686553f989b93f32b` | `FINALIZED`, `SUCCESS`, consensus reached; EP output `REQUIRED_FIELD_ADDED`, `statuses.old=200`, `statuses.new=200` | `state=ASSESSED`, outcome `REQUIRED_FIELD_ADDED`, `required_fields_added=[income]`, `evidence_digest=f4b4fc1443f543d3f003335f15797abf071906328976cc5c3f232b54eb8c1e19` |

The matrix proves one complete critical journey: create a draft, freeze the
revision identities, independently fetch both HTTPS JSON sources in consensus,
record the single required-field addition, and confirm the resulting state from
the finalized readback. No upgrade or replacement path was exercised because
the contract is intentionally frozen.

## GitHub and Vercel release evidence

- GitHub repository: `https://github.com/ptc123456/benefits-form-revision-comparison-register`.
- GitHub account used for the push: `ptc123456`; pushed branch: `master`; pushed
  commit used by the cited Vercel deployment: `2345ea48870675381bb6ba95c887c1e7019fb3a1`.
- Vercel account/team: `phamthanhcong2006tb-9420` / `shingg`.
- Vercel project: `benefits-form-revision-comparison-register`, project ID
  `prj_06yvugMSHY6XMiNlpEDQg6HcqjPf`.
- GitHub repository is connected to this Vercel project for commit-triggered
  deployments.
- Production deployment: `dpl_G7StffS2S5puGWYSVdZy1m4eNRi2`;
  `READY`; inspect URL
  `https://benefits-form-revision-comparison-register-4r3nx0d10-shingg.vercel.app`;
  production alias `https://benefits-form-revision-comparison-r.vercel.app`.
- The deployment was built from `frontend/`; install command was
  `npm --prefix frontend ci`, build command was `npm --prefix frontend run build`,
  output directory was `frontend/dist`, and Node.js was `24.x`. `npm run typecheck`
  and `npm run build` passed in the exact checkout. Production
  `VITE_CONTRACT_ADDRESS` is the verified Studionet address
  `0x5E91f54956C62E6EDBEce49feA42282F16A0a962`.
- The exact immutable Vercel release rendered the expected Formline heading,
  Studionet environment, register / freeze / assess sections, and verified
  contract address in Codex Chrome. The production alias resolves the same
  release lineage.

## EXPLORER_PRE_SUBMISSION preset remediation

- Correction commit: `2345ea48870675381bb6ba95c887c1e7019fb3a1`; contract source
  remained unchanged at commit `48a123d49c3dae79dc17a669afed7a43eacfaba9` and
  SHA-256 `5B2A195B900DBCB0027DF3B9674FEC74C2304AF877419EA8C32A37DC5F0566C6`.
- Corrected release: Vercel deployment `dpl_G7StffS2S5puGWYSVdZy1m4eNRi2`,
  `READY`, production, immutable URL
  `https://benefits-form-revision-comparison-register-4r3nx0d10-shingg.vercel.app`;
  production alias `https://benefits-form-revision-comparison-r.vercel.app`.
- All six Example Preset endpoints on the corrected release were independently
  checked and returned HTTP `200`. Each response parsed as JSON and contained
  `program_id`, a distinct `revision_id`, `required_field_ids`,
  `required_attachment_ids`, and `deadline`; each pair uses matching
  `program_id=BENEFITS-2026`.
- Exact endpoint receipts:
  - Field Addition old: `https://httpbin.org/base64/eyJwcm9ncmFtX2lkIjoiQkVORUZJVFMtMjAyNiIsInJldmlzaW9uX2lkIjoiZmllbGRzLXYxIiwicmVxdWlyZWRfZmllbGRfaWRzIjpbIm5hbWUiLCJhZGRyZXNzIl0sInJlcXVpcmVkX2F0dGFjaG1lbnRfaWRzIjpbImlkIl0sImRlYWRsaW5lIjoiTk9ORSJ9` → HTTP `200`, `revision_id=fields-v1`.
  - Field Addition new: `https://httpbin.org/base64/eyJwcm9ncmFtX2lkIjoiQkVORUZJVFMtMjAyNiIsInJldmlzaW9uX2lkIjoiZmllbGRzLXYyIiwicmVxdWlyZWRfZmllbGRfaWRzIjpbIm5hbWUiLCJhZGRyZXNzIiwiaW5jb21lIl0sInJlcXVpcmVkX2F0dGFjaG1lbnRfaWRzIjpbImlkIl0sImRlYWRsaW5lIjoiTk9ORSJ9` → HTTP `200`, `revision_id=fields-v2`.
  - Deadline Shift old: `https://httpbin.org/base64/eyJwcm9ncmFtX2lkIjoiQkVORUZJVFMtMjAyNiIsInJldmlzaW9uX2lkIjoiZGVhZGxpbmUtdjEiLCJyZXF1aXJlZF9maWVsZF9pZHMiOlsibmFtZSIsImluY29tZSJdLCJyZXF1aXJlZF9hdHRhY2htZW50X2lkcyI6WyJpZCJdLCJkZWFkbGluZSI6IjIwMjYtMDQtMTUifQ%3D%3D` → HTTP `200`, `revision_id=deadline-v1`.
  - Deadline Shift new: `https://httpbin.org/base64/eyJwcm9ncmFtX2lkIjoiQkVORUZJVFMtMjAyNiIsInJldmlzaW9uX2lkIjoiZGVhZGxpbmUtdjIiLCJyZXF1aXJlZF9maWVsZF9pZHMiOlsibmFtZSIsImluY29tZSJdLCJyZXF1aXJlZF9hdHRhY2htZW50X2lkcyI6WyJpZCJdLCJkZWFkbGluZSI6IjIwMjYtMDYtMzAifQ%3D%3D` → HTTP `200`, `revision_id=deadline-v2`.
  - Attachment Set old: `https://httpbin.org/base64/eyJwcm9ncmFtX2lkIjoiQkVORUZJVFMtMjAyNiIsInJldmlzaW9uX2lkIjoiYXR0YWNobWVudHMtdjEiLCJyZXF1aXJlZF9maWVsZF9pZHMiOlsibmFtZSIsImluY29tZSJdLCJyZXF1aXJlZF9hdHRhY2htZW50X2lkcyI6WyJpZC1wcm9vZiJdLCJkZWFkbGluZSI6Ik5PTkUifQ%3D%3D` → HTTP `200`, `revision_id=attachments-v1`.
  - Attachment Set new: `https://httpbin.org/base64/eyJwcm9ncmFtX2lkIjoiQkVORUZJVFMtMjAyNiIsInJldmlzaW9uX2lkIjoiYXR0YWNobWVudHMtdjIiLCJyZXF1aXJlZF9maWVsZF9pZHMiOlsibmFtZSIsImluY29tZSJdLCJyZXF1aXJlZF9hdHRhY2htZW50X2lkcyI6WyJpZC1wcm9vZiIsInRheC1yZXR1cm4tMjAyNiJdLCJkZWFkbGluZSI6Ik5PTkUifQ%3D%3D` → HTTP `200`, `revision_id=attachments-v2`.
- Preset pairs verified: Field Addition (`fields-v1` → `fields-v2`), Deadline
  Change (`deadline-v1` → `deadline-v2`), and Attachments
  (`attachments-v1` → `attachments-v2`).
- Chrome smoke on the exact corrected release opened `Example Presets` and
  selected all three buttons; each populated `BENEFITS-2026` plus two distinct
  `https://httpbin.org/base64/` endpoints. No wallet connection or transaction
  was required for this verification.
- Local regression after the correction: 14 frontend tests passed, typecheck
  passed, production build passed, and `git diff --check` passed. No contract
  deployment or transaction was created for this frontend-only correction.

## POST_GITHUB_VERCEL_FINAL live wallet E2E

- Exact release under test: Vercel deployment
  `dpl_DT8S5K1oU9p25RUXUhXukgREKgfJ`, immutable URL
  `https://benefits-form-revision-comparison-register-bxvtemjz3-shingg.vercel.app`,
  production alias `https://benefits-form-revision-comparison-r.vercel.app`,
  GitHub `master` commit
  `666a42905482c0c32d701306c6e2367d5a23953d`.
- Wallet/account evidence: Codex Chrome opened the public wallet picker;
  OKX Wallet was explicitly selected from the available choices. The connected
  signer was `0x896Ef52d620eA3CCdA34B4E72a8E197974e4e39E` on GenLayer Studionet
  chain `61999`. No provider internals or technical routing details are shown
  in the public UI.
- Case used for the exact release journey:
  `case-f25e955488b33ad268ed2bdc0490d76aec9bdb897b8754a7caff9708fea67ba6`;
  owner and program readback matched the connected signer and `benefits-demo`.

| Row | Vercel journey transaction | Verified result and authoritative readback |
|---|---|---|
| VERCEL-01 | `create_case(benefits-demo, old_url, new_url, df0e8a50aae84f92a447328ffe87e078)`; `0x0b663c7ac4973d52fb56393bb74f423d15f0f2ecdc1c7a6be2ee4f14d52d1c68` | `FINALIZED`, `MAJORITY_AGREE`, agreeing validators `SUCCESS`; deterministic case readback `state=DRAFT`, owner matched. Initial delayed JSON visibility was recovered by explicit Read State and verified reconciliation without resubmission. |
| VERCEL-02 | `freeze_case(case_id, rev-old-001, rev-new-001)`; `0xac23a64a0288a86ef63a819e951cc5f3094853a1a6544e4aef3425fd723a81fa` | `FINALIZED`, `MAJORITY_AGREE`, 4 agreeing validator executions `SUCCESS`; authoritative readback `state=FROZEN` with both frozen revision IDs exact. |
| VERCEL-03 | `assess(case_id)`; `0x04761d7df448cff0f79bea74b2001d26d2f417ded8b7fcaf18d5a5a4a40bed28` | `FINALIZED`, `MAJORITY_AGREE`, 2 agreeing validator executions `SUCCESS`; authoritative readback `state=ASSESSED`, outcome `REQUIRED_FIELD_ADDED`, `required_fields_added=[income]`, `statuses.old=200`, `statuses.new=200`, digest `f4b4fc1443f543d3f003335f15797abf071906328976cc5c3f232b54eb8c1e19`. |

- Wallet lifecycle regression on the same exact release passed: explicit
  disconnect returned the header to `Connect wallet`; reload reset the wallet
  to disconnected without auto-reconnect or auto-read; the picker was reopened,
  OKX was explicitly selected, reconnect succeeded, and the exact case was
  read back again as `ASSESSED` with the same outcome, field, statuses, and
  evidence digest. No additional write transaction was created during this
  regression.
