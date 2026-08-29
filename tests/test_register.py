import json
from pathlib import Path

import pytest


CONTRACT = Path(__file__).parents[1] / "contracts" / "benefits_form_revision_register.py"
OLD_URL = "https://forms.example.org/benefits/old.json"
NEW_URL = "https://forms.example.org/benefits/new.json"


def source(program_id="BENEFITS-2026", revision_id="r1", fields=None, attachments=None, deadline="2026-12-31"):
    return json.dumps(
        {
            "program_id": program_id,
            "revision_id": revision_id,
            "required_field_ids": fields or ["applicant_name", "income"],
            "required_attachment_ids": attachments or ["proof_of_income"],
            "deadline": deadline,
            "label": "presentation-only text may change",
        }
    )


def setup_case(direct_vm, direct_deploy, direct_alice):
    direct_vm.sender = direct_alice
    contract = direct_deploy(str(CONTRACT))
    case_id = contract.create_case("BENEFITS-2026", OLD_URL, NEW_URL, "nonce-1")
    contract.freeze_case(case_id, "r1", "r2")
    return contract, case_id


def mock_pair(direct_vm, old_body, new_body, old_status=200, new_status=200):
    direct_vm.mock_web(r".*old\.json.*", {"status": old_status, "body": old_body})
    direct_vm.mock_web(r".*new\.json.*", {"status": new_status, "body": new_body})


def test_create_and_freeze_owner_gate(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    contract = direct_deploy(str(CONTRACT))
    case_id = contract.create_case("BENEFITS-2026", OLD_URL, NEW_URL, "nonce-1")
    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("Only the case owner can freeze it"):
            contract.freeze_case(case_id, "r1", "r2")
    contract.freeze_case(case_id, "r1", "r2")
    assert json.loads(contract.get_case(case_id))["state"] == "FROZEN"


def test_layout_only_change_is_same_requirements(direct_vm, direct_deploy, direct_alice):
    contract, case_id = setup_case(direct_vm, direct_deploy, direct_alice)
    mock_pair(
        direct_vm,
        source(),
        '{ "program_id":"BENEFITS-2026", "revision_id":"r2", "required_field_ids":["income","applicant_name"], "required_attachment_ids":["proof_of_income"], "deadline":"2026-12-31", "label":"changed" }',
    )
    contract.assess(case_id)
    result = json.loads(contract.get_case(case_id))
    assert result["outcome"] == "SAME_REQUIREMENTS"
    assert result["required_fields_added"] == []


def test_field_attachment_and_deadline_changes_are_separate(direct_vm, direct_deploy, direct_alice):
    contract, case_id = setup_case(direct_vm, direct_deploy, direct_alice)
    mock_pair(direct_vm, source(), source(revision_id="r2", fields=["applicant_name", "income", "residency"]))
    contract.assess(case_id)
    result = json.loads(contract.get_case(case_id))
    assert result["outcome"] == "REQUIRED_FIELD_ADDED"
    assert result["required_fields_added"] == ["residency"]


def test_attachment_and_deadline_changes_are_multiple(direct_vm, direct_deploy, direct_alice):
    contract, case_id = setup_case(direct_vm, direct_deploy, direct_alice)
    mock_pair(direct_vm, source(), source(revision_id="r2", attachments=["proof_of_income", "identity"], deadline="2027-01-01"))
    contract.assess(case_id)
    result = json.loads(contract.get_case(case_id))
    assert result["outcome"] == "MULTIPLE_REQUIREMENT_CHANGES"
    assert result["required_attachments_added"] == ["identity"]
    assert result["deadline_changed"] is True


def test_program_mismatch_and_unavailable_are_unresolved_or_mismatch(direct_vm, direct_deploy, direct_alice):
    contract, case_id = setup_case(direct_vm, direct_deploy, direct_alice)
    mock_pair(direct_vm, source(), source(program_id="OTHER", revision_id="r2"))
    contract.assess(case_id)
    assert json.loads(contract.get_case(case_id))["outcome"] == "FORM_ID_MISMATCH"


def test_rate_limit_is_unresolved(direct_vm, direct_deploy, direct_alice):
    contract, case_id = setup_case(direct_vm, direct_deploy, direct_alice)
    mock_pair(direct_vm, source(), b"", new_status=429)
    contract.assess(case_id)
    result = json.loads(contract.get_case(case_id))
    assert result["outcome"] == "UNRESOLVED"
    assert result["reason"] == "UPSTREAM_UNAVAILABLE"


def test_invalid_source_and_disagreement_are_safe(direct_vm, direct_deploy, direct_alice):
    contract, case_id = setup_case(direct_vm, direct_deploy, direct_alice)
    mock_pair(direct_vm, source(), b"not-json")
    contract.assess(case_id)
    assert json.loads(contract.get_case(case_id))["outcome"] == "UNRESOLVED"


def test_frozen_revision_identity_mismatch_is_retryable(direct_vm, direct_deploy, direct_alice):
    contract, case_id = setup_case(direct_vm, direct_deploy, direct_alice)
    mock_pair(direct_vm, source(), source(revision_id="r3"))
    contract.assess(case_id)
    result = json.loads(contract.get_case(case_id))
    assert result["outcome"] == "UNRESOLVED"
    assert result["reason"] == "SOURCE_REVISION_CHANGED"
    assert result["retry_count"] == 0


def test_assessor_boundary_and_retry_from_frozen_case(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract, case_id = setup_case(direct_vm, direct_deploy, direct_alice)
    mock_pair(direct_vm, source(), source(revision_id="r2"))
    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("Only the assigned assessor can assess this case"):
            contract.assess(case_id)
    contract.retry_unresolved(case_id)
    result = json.loads(contract.get_case(case_id))
    assert result["state"] == "ASSESSED"
    assert result["retry_count"] == 1


def test_validator_rejects_material_disagreement(direct_vm, direct_deploy, direct_alice):
    contract, case_id = setup_case(direct_vm, direct_deploy, direct_alice)
    mock_pair(direct_vm, source(), source(revision_id="r2", fields=["applicant_name", "income", "new_field"]))
    contract.assess(case_id)
    direct_vm.clear_mocks()
    mock_pair(direct_vm, source(), source(revision_id="r2", fields=["applicant_name", "income"]))
    assert direct_vm.run_validator() is False


def test_transaction_consensus_failure_leaves_case_frozen(direct_vm, direct_deploy, direct_alice, monkeypatch):
    contract, case_id = setup_case(direct_vm, direct_deploy, direct_alice)

    import genlayer.gl.vm as gl_vm

    def fail_consensus(*_args, **_kwargs):
        raise RuntimeError("simulated transaction-level consensus failure")

    monkeypatch.setattr(gl_vm, "run_nondet", fail_consensus)
    with pytest.raises(RuntimeError, match="transaction-level consensus failure"):
        contract.assess(case_id)
    assert json.loads(contract.get_case(case_id))["state"] == "FROZEN"


def test_retry_is_bounded(direct_vm, direct_deploy, direct_alice):
    contract, case_id = setup_case(direct_vm, direct_deploy, direct_alice)
    mock_pair(direct_vm, source(), b"not-json")
    contract.assess(case_id)
    for _ in range(3):
        contract.retry_unresolved(case_id)
    with direct_vm.expect_revert("Retry limit reached"):
        contract.retry_unresolved(case_id)
