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
  commit before this evidence update: `3c06d353917800bd7f63c28221e0272d2cebaf9`.
- Vercel account/team: `phamthanhcong2006tb-9420` / `shingg`.
- Vercel project: `benefits-form-revision-comparison-register`, project ID
  `prj_06yvugMSHY6XMiNlpEDQg6HcqjPf`.
- Production deployment: `dpl_94zwRmEWKqcUdpWcMRMBRRs2e7gV`;
  `READY`; inspect URL
  `https://vercel.com/shingg/benefits-form-revision-comparison-register/94zwRmEWKqcUdpWcMRMBRRs2e7gV`;
  production alias `https://benefits-form-revision-comparison-r.vercel.app`.
- The deployment was built from `frontend/`; `npm run typecheck` and
  `npm run build` passed in the exact checkout. Production
  `VITE_CONTRACT_ADDRESS` is the verified Studionet address
  `0x5E91f54956C62E6EDBEce49feA42282F16A0a962`.
- Codex in-app Browser smoke read the production alias successfully: the page
  rendered the expected Formline heading, Studionet chain `61999`, register /
  freeze / assess sections, and the signer remained explicitly disconnected.
  No wallet transaction was submitted from the Vercel page in this smoke pass;
  final user-wallet E2E remains a separate required checkpoint.
