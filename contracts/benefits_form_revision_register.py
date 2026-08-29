# v0.1.0
# { "Seq": [ { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" } ] }

from genlayer import *

import hashlib
import json
import re


MAX_CASES = 1000
MAX_URL_LENGTH = 2048
MAX_ID_LENGTH = 80
MAX_IDS = 64
MAX_RETRIES = 3
MAX_NONCE_LENGTH = 80

OUTCOMES = (
    "SAME_REQUIREMENTS",
    "REQUIRED_FIELD_ADDED",
    "REQUIRED_FIELD_REMOVED",
    "DEADLINE_CHANGED",
    "FORM_ID_MISMATCH",
    "MULTIPLE_REQUIREMENT_CHANGES",
    "UNRESOLVED",
)


def _canonical(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _valid_nonce(value: str) -> bool:
    return (
        isinstance(value, str)
        and 1 <= len(value) <= MAX_NONCE_LENGTH
        and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:-]*", value) is not None
    )


def _case_id(owner: str, nonce: str) -> str:
    return "case-" + _sha256(_canonical({"owner": owner, "nonce": nonce}))


def _valid_url(value: str) -> bool:
    return (
        isinstance(value, str)
        and len(value) <= MAX_URL_LENGTH
        and value.startswith("https://")
        and "\n" not in value
        and "\r" not in value
        and " " not in value
    )


def _valid_program_id(value: str) -> bool:
    return (
        isinstance(value, str)
        and 1 <= len(value) <= MAX_ID_LENGTH
        and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:-]*", value) is not None
    )


def _normalize_ids(value) -> list[str]:
    if not isinstance(value, list) or len(value) > MAX_IDS:
        raise ValueError("required IDs must be a bounded list")
    normalized = []
    for item in value:
        if (
            not isinstance(item, str)
            or not 1 <= len(item) <= MAX_ID_LENGTH
            or re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:-]*", item) is None
        ):
            raise ValueError("required IDs must be bounded identifiers")
        if item in normalized:
            raise ValueError("required IDs must be unique")
        normalized.append(item)
    return sorted(normalized)


def _normalize_deadline(value) -> str:
    if not isinstance(value, str):
        raise ValueError("deadline must be a string")
    value = value.strip()
    if value == "NONE":
        return value
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value) is None:
        raise ValueError("deadline must be YYYY-MM-DD or NONE")
    return value


def _safe_result(reason: str, statuses: dict) -> dict:
    return {
        "outcome": "UNRESOLVED",
        "reason": reason,
        "statuses": statuses,
        "old_program_id": "",
        "new_program_id": "",
        "old_revision_id": "",
        "new_revision_id": "",
        "old_deadline": "",
        "new_deadline": "",
        "required_fields_added": [],
        "required_fields_removed": [],
        "required_attachments_added": [],
        "required_attachments_removed": [],
        "deadline_changed": False,
        "evidence_digest": "",
    }


def _fetch(url: str) -> dict:
    try:
        response = gl.nondet.web.get(url)
        status = int(response.status)
        body = response.body or b""
        if status == 200:
            if len(body) > 250000:
                return {"status": status, "body": b"", "reason": "SOURCE_TOO_LARGE"}
            return {"status": status, "body": body, "reason": ""}
        if status == 429 or status >= 500:
            return {"status": status, "body": b"", "reason": "UPSTREAM_UNAVAILABLE"}
        return {"status": status, "body": b"", "reason": "SOURCE_NOT_FOUND" if status in (404, 410) else "SOURCE_INVALID"}
    except Exception:
        return {"status": 0, "body": b"", "reason": "UPSTREAM_UNAVAILABLE"}


def _parse_source(response: dict) -> dict:
    try:
        payload = json.loads(response["body"].decode("utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("source must be an object")
        program_id = payload.get("program_id")
        revision_id = payload.get("revision_id")
        if not _valid_program_id(program_id) or not _valid_program_id(revision_id):
            raise ValueError("source identity is invalid")
        fields = _normalize_ids(payload.get("required_field_ids"))
        attachments = _normalize_ids(payload.get("required_attachment_ids"))
        deadline = _normalize_deadline(payload.get("deadline"))
        normalized = {
            "program_id": program_id,
            "revision_id": revision_id,
            "required_field_ids": fields,
            "required_attachment_ids": attachments,
            "deadline": deadline,
        }
        return {"ok": True, "value": normalized}
    except Exception:
        return {"ok": False, "value": {}}


def _evaluate(program_id: str, old_url: str, new_url: str, expected_old_revision: str, expected_new_revision: str) -> dict:
    old_response = _fetch(old_url)
    new_response = _fetch(new_url)
    statuses = {"old": old_response["status"], "new": new_response["status"]}
    for response in (old_response, new_response):
        if response["reason"] in ("UPSTREAM_UNAVAILABLE", "SOURCE_TOO_LARGE"):
            return _safe_result(response["reason"], statuses)
        if response["status"] != 200:
            return _safe_result(response["reason"], statuses)

    old = _parse_source(old_response)
    new = _parse_source(new_response)
    if not old["ok"] or not new["ok"]:
        return _safe_result("SOURCE_INVALID", statuses)

    old_value = old["value"]
    new_value = new["value"]
    if (
        old_value["revision_id"] != expected_old_revision
        or new_value["revision_id"] != expected_new_revision
    ):
        return _safe_result("SOURCE_REVISION_CHANGED", statuses)
    old_fields = set(old_value["required_field_ids"])
    new_fields = set(new_value["required_field_ids"])
    old_attachments = set(old_value["required_attachment_ids"])
    new_attachments = set(new_value["required_attachment_ids"])
    fields_added = sorted(new_fields - old_fields)
    fields_removed = sorted(old_fields - new_fields)
    attachments_added = sorted(new_attachments - old_attachments)
    attachments_removed = sorted(old_attachments - new_attachments)
    deadline_changed = old_value["deadline"] != new_value["deadline"]
    identity_mismatch = (
        old_value["program_id"] != program_id
        or new_value["program_id"] != program_id
        or old_value["program_id"] != new_value["program_id"]
    )

    changed_classes = sum(
        bool(value)
        for value in (
            fields_added,
            fields_removed,
            attachments_added,
            attachments_removed,
            deadline_changed,
        )
    )
    if identity_mismatch:
        outcome = "FORM_ID_MISMATCH"
    elif changed_classes > 1:
        outcome = "MULTIPLE_REQUIREMENT_CHANGES"
    elif fields_added:
        outcome = "REQUIRED_FIELD_ADDED"
    elif fields_removed:
        outcome = "REQUIRED_FIELD_REMOVED"
    elif attachments_added or attachments_removed:
        outcome = "MULTIPLE_REQUIREMENT_CHANGES"
    elif deadline_changed:
        outcome = "DEADLINE_CHANGED"
    else:
        outcome = "SAME_REQUIREMENTS"

    canonical_evidence = {
        "old": old_value,
        "new": new_value,
        "old_url": old_url,
        "new_url": new_url,
    }
    return {
        "outcome": outcome,
        "reason": "",
        "statuses": statuses,
        "old_program_id": old_value["program_id"],
        "new_program_id": new_value["program_id"],
        "old_revision_id": old_value["revision_id"],
        "new_revision_id": new_value["revision_id"],
        "old_deadline": old_value["deadline"],
        "new_deadline": new_value["deadline"],
        "required_fields_added": fields_added,
        "required_fields_removed": fields_removed,
        "required_attachments_added": attachments_added,
        "required_attachments_removed": attachments_removed,
        "deadline_changed": deadline_changed,
        "evidence_digest": _sha256(_canonical(canonical_evidence)),
    }


def _consensus_projection(value: dict) -> str:
    fields = (
        "outcome",
        "old_program_id",
        "new_program_id",
        "old_revision_id",
        "new_revision_id",
        "old_deadline",
        "new_deadline",
        "required_fields_added",
        "required_fields_removed",
        "required_attachments_added",
        "required_attachments_removed",
        "deadline_changed",
        "evidence_digest",
    )
    return _canonical({field: value.get(field) for field in fields})


def _validate_case_input(program_id: str, old_url: str, new_url: str) -> None:
    if not _valid_program_id(program_id):
        raise gl.vm.UserError("Program ID must be a bounded identifier")
    if not _valid_url(old_url) or not _valid_url(new_url):
        raise gl.vm.UserError("Form sources must be HTTPS URLs without spaces")
    if old_url == new_url:
        raise gl.vm.UserError("Old and new form sources must differ")


class BenefitsFormRevisionRegister(gl.Contract):
    cases: TreeMap[str, str]
    case_count: u256

    def __init__(self):
        self.case_count = u256(0)

    @gl.public.write
    def create_case(self, program_id: str, old_url: str, new_url: str, case_nonce: str) -> str:
        _validate_case_input(program_id, old_url, new_url)
        if not _valid_nonce(case_nonce):
            raise gl.vm.UserError("Case nonce must be a bounded identifier")
        if int(self.case_count) >= MAX_CASES:
            raise gl.vm.UserError("Case capacity reached")
        owner = str(gl.message.sender_address)
        case_id = _case_id(owner, case_nonce)
        if self.cases.get(case_id, ""):
            raise gl.vm.UserError("Case nonce already used by this owner")
        self.case_count += u256(1)
        self.cases[case_id] = _canonical(
            {
                "case_id": case_id,
                "owner": owner,
                "assessor": owner,
                "case_nonce": case_nonce,
                "program_id": program_id,
                "old_url": old_url,
                "new_url": new_url,
                "state": "DRAFT",
                "outcome": "UNRESOLVED",
                "reason": "",
                "statuses": {},
                "old_program_id": "",
                "new_program_id": "",
                "old_revision_id": "",
                "new_revision_id": "",
                "frozen_old_revision_id": "",
                "frozen_new_revision_id": "",
                "old_deadline": "",
                "new_deadline": "",
                "required_fields_added": [],
                "required_fields_removed": [],
                "required_attachments_added": [],
                "required_attachments_removed": [],
                "deadline_changed": False,
                "evidence_digest": "",
                "retry_count": 0,
            }
        )
        return case_id

    @gl.public.write
    def freeze_case(self, case_id: str, old_revision_id: str, new_revision_id: str) -> None:
        raw = self.cases.get(case_id, "")
        if not raw:
            raise gl.vm.UserError("Case not found")
        case = json.loads(raw)
        if case["owner"] != str(gl.message.sender_address):
            raise gl.vm.UserError("Only the case owner can freeze it")
        if case["state"] != "DRAFT":
            raise gl.vm.UserError("Only a draft case can be frozen")
        if not _valid_program_id(old_revision_id) or not _valid_program_id(new_revision_id):
            raise gl.vm.UserError("Revision IDs must be bounded identifiers")
        if old_revision_id == new_revision_id:
            raise gl.vm.UserError("Old and new revision IDs must differ")
        case["frozen_old_revision_id"] = old_revision_id
        case["frozen_new_revision_id"] = new_revision_id
        case["state"] = "FROZEN"
        self.cases[case_id] = _canonical(case)

    def _assess_case(self, case_id: str, retry: bool) -> None:
        raw = self.cases.get(case_id, "")
        if not raw:
            raise gl.vm.UserError("Case not found")
        case = json.loads(raw)
        allowed_state = case["state"] == "FROZEN" or (retry and case["state"] == "UNRESOLVED")
        if not allowed_state:
            raise gl.vm.UserError("Case must be frozen or unresolved before assessment")
        if case["assessor"] != str(gl.message.sender_address):
            raise gl.vm.UserError("Only the assigned assessor can assess this case")
        if retry and int(case["retry_count"]) >= MAX_RETRIES:
            raise gl.vm.UserError("Retry limit reached")

        program_id = case["program_id"]
        old_url = case["old_url"]
        new_url = case["new_url"]
        expected_old_revision = case["frozen_old_revision_id"]
        expected_new_revision = case["frozen_new_revision_id"]

        def leader_fn() -> str:
            return _canonical(_evaluate(program_id, old_url, new_url, expected_old_revision, expected_new_revision))

        def validator_fn(leader_result: gl.vm.Result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                leader_value = json.loads(leader_result.calldata)
                validator_value = json.loads(leader_fn())
                return _consensus_projection(leader_value) == _consensus_projection(validator_value)
            except Exception:
                return False

        try:
            result = json.loads(gl.vm.run_nondet(leader_fn, validator_fn))
        except Exception:
            result = _safe_result("CONSENSUS_UNRESOLVED", {})
        case.update(result)
        case["state"] = "UNRESOLVED" if result["outcome"] == "UNRESOLVED" else "ASSESSED"
        case["retry_count"] = int(case["retry_count"]) + (1 if retry else 0)
        self.cases[case_id] = _canonical(case)

    @gl.public.write
    def assess(self, case_id: str) -> None:
        self._assess_case(case_id, False)

    @gl.public.write
    def retry_unresolved(self, case_id: str) -> None:
        self._assess_case(case_id, True)

    @gl.public.view
    def get_case_id(self, owner: str, case_nonce: str) -> str:
        if not _valid_nonce(case_nonce):
            raise gl.vm.UserError("Case nonce must be a bounded identifier")
        return _case_id(owner, case_nonce)

    @gl.public.view
    def get_case(self, case_id: str) -> str:
        return self.cases.get(case_id, "")

    @gl.public.view
    def get_case_count(self) -> u256:
        return self.case_count
