
from app.main import find_likely_lab_lines


def test_parses_all_five_lab_results():
    text = "\n".join([
        "Hemoglobin",
        "13.5",
        "g/dL",
        "12.0–16.0",
        "WBC",
        "6.2",
        "10^3/uL",
        "4.0–11.0",
        "Platelets",
        "250",
        "10^3/uL",
        "150–400",
        "Glucose",
        "92",
        "mg/dL",
        "70–99",
        "Sodium",
        "140",
        "mmol/L",
        "135–145",
        "Footer: fictional report for software testing.",
    ])

    results = find_likely_lab_lines(text)

    expected = [
        ("Hemoglobin", "13.5", "g/dL", "12.0-16.0", 1),
        ("WBC", "6.2", "10^3/uL", "4.0-11.0", 5),
        ("Platelets", "250", "10^3/uL", "150-400", 9),
        ("Glucose", "92", "mg/dL", "70-99", 13),
        ("Sodium", "140", "mmol/L", "135-145", 17),
    ]

    assert len(results) == 5

    for result, (name, value, unit, ref_range, line_number) in zip(
        results, expected
    ):
        assert result["test_name"] == name
        assert result["value"] == value
        assert result["unit"] == unit
        assert result["reference_range"] == ref_range
        assert result["source_line_number"] == line_number
        assert result["needs_review"] is True
        assert result["status"] == "candidate_unverified"

    sodium = results[-1]
    assert "Footer" not in sodium["source_line"]


def test_missing_value_is_not_invented():
    results = find_likely_lab_lines(
        "Hemoglobin\nResult unavailable"
    )

    assert len(results) == 1
    assert results[0]["test_name"] == "Hemoglobin"
    assert results[0]["value"] is None
    assert results[0]["needs_review"] is True
    assert results[0]["status"] == "incomplete_candidate"


def test_empty_text_returns_no_results():
    assert find_likely_lab_lines("") == []

def test_unit_search_recognizes_valid_formats_and_rejects_ambiguous_unit():
    from app.main import UNIT_SEARCH_RE

    assert UNIT_SEARCH_RE.search("10^9/L").group(0) == "10^9/L"
    assert UNIT_SEARCH_RE.search("10^3/uL").group(0) == "10^3/uL"
    assert UNIT_SEARCH_RE.search("10I/L") is None
