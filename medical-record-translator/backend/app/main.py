
from io import BytesIO
import re

import fitz
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Medical Record Translator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_PAGES = 100
MAX_RESULTS = 200

TEST_PATTERNS = [
    ("Hemoglobin", r"\bhemoglobin\b|\bhaemoglobin\b|\bhgb\b"),
    ("Hematocrit", r"\bhematocrit\b|\bhaematocrit\b|\bhct\b"),
    ("Platelets", r"\bplatelets?\b|\bplt\b"),
    ("WBC", r"\bwbc\b|\bwhite blood cells?\b"),
    ("RBC", r"\brbc\b|\bred blood cells?\b"),
    ("Glucose", r"\bglucose\b"),
    ("Sodium", r"\bsodium\b"),
    ("Potassium", r"\bpotassium\b"),
    ("Creatinine", r"\bcreatinine\b"),
    ("Cholesterol", r"\bcholesterol\b"),
    ("TSH", r"\btsh\b"),
    ("ALT", r"\balt\b|\balanine aminotransferase\b"),
    ("AST", r"\bast\b|\baspartate aminotransferase\b"),
    ("Calcium", r"\bcalcium\b"),
]

NUMBER = r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)"

RANGE_RE = re.compile(
    rf"^\s*({NUMBER})\s*(?:-|–|—|\bto\b)\s*({NUMBER})\s*$",
    re.IGNORECASE,
)

VALUE_RE = re.compile(rf"^\s*({NUMBER})\s*(.*)$")

UNIT_RE = re.compile(
    r"^(?:"
    r"mg/dL|g/dL|mmol/L|mEq/L|"
    r"10\^?\d+/uL|10\^?\d+/µL|"
    r"10\^?\d+/L|"
    r"U/L|IU/L|mIU/L|"
    r"ng/mL|pg/mL|µg/dL|mcg/dL|"
    r"fL|pg|%|mmol/mol|"
    r"cells/uL|cells/µL|"
    r"mg/L|g/L|"
    r"seconds|sec|"
    r"mm/hr|mm/h"
    r")$",
    re.IGNORECASE,
)


def identify_test(line: str):
    for name, pattern in TEST_PATTERNS:
        match = re.search(pattern, line, re.IGNORECASE)
        if match:
            return name, match
    return None, None


def parse_value_line(line: str):
    """Return a possible numeric value and trailing text."""
    match = VALUE_RE.fullmatch(line.strip())

    if not match:
        return None, None

    return match.group(1), match.group(2).strip()


def find_likely_lab_lines(text: str) -> list[dict]:
    """Extract candidate results while preserving source lines and uncertainty."""
    lines = [" ".join(line.split()) for line in text.splitlines()]
    candidates = []
    i = 0

    while i < len(lines) and len(candidates) < MAX_RESULTS:
        line = lines[i]
        test_name, test_match = identify_test(line)

        if not test_name:
            i += 1
            continue

        # Preserve the original test-name line number.
        test_line_number = i + 1
        source_lines = [line] if line else []
        value = None
        unit = None
        reference_range = None

        remainder = line[test_match.end():].strip()
        next_i = i + 1

        if remainder:
            # Handle a value written on the same line as the test name.
            possible_value, trailing = parse_value_line(remainder)

            if possible_value is not None:
                value = possible_value

                if trailing and UNIT_RE.fullmatch(trailing):
                    unit = trailing

            same_line_range = RANGE_RE.search(line)

            if same_line_range:
                reference_range = (
                    f"{same_line_range.group(1)}-"
                    f"{same_line_range.group(2)}"
                )

        else:
            # Search subsequent lines without consuming the next test.
            j = i + 1
            scan_limit = min(i + 8, len(lines))

            while j < scan_limit:
                next_line = lines[j]

                if not next_line:
                    j += 1
                    continue

                next_test, _ = identify_test(next_line)

                if next_test:
                    break

                source_lines.append(next_line)

                range_match = RANGE_RE.fullmatch(next_line)

                if range_match:
                    reference_range = (
                        f"{range_match.group(1)}-"
                        f"{range_match.group(2)}"
                    )
                    j += 1
                    break

                possible_value, trailing = parse_value_line(next_line)

                if possible_value is not None and value is None:
                    value = possible_value

                    if trailing and UNIT_RE.fullmatch(trailing):
                        unit = trailing

                elif (
                    value is not None
                    and unit is None
                    and UNIT_RE.fullmatch(next_line)
                ):
                    unit = next_line

                j += 1

            # If we stopped at another test, leave it for the next iteration.
            next_i = j

        candidates.append({
            "test_name": test_name,
            "value": value,
            "unit": unit,
            "reference_range": reference_range,
            "source_line": " | ".join(source_lines),
            "source_line_number": test_line_number,
            "needs_review": True,
            "status": (
                "candidate_unverified"
                if value is not None
                else "incomplete_candidate"
            ),
        })

        # Move to the next unprocessed line.
        i = next_i

    return candidates


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/reports/extract")
async def extract_report(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Please upload a PDF file.")

    contents = await file.read(MAX_FILE_SIZE + 1)

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(413, "The PDF must be 10 MB or smaller.")

    if not contents:
        raise HTTPException(400, "The uploaded file is empty.")

    try:
        with fitz.open(stream=BytesIO(contents), filetype="pdf") as doc:
            if doc.is_encrypted:
                raise HTTPException(
                    400,
                    "Password-protected PDFs are not supported.",
                )

            if not 1 <= doc.page_count <= MAX_PAGES:
                raise HTTPException(
                    400,
                    "The PDF must contain between 1 and 100 pages.",
                )

            page_count = doc.page_count
            extracted_text = "\n".join(
                page.get_text() for page in doc
            ).strip()

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            400,
            "Could not read this PDF. Please try another file.",
        )

    if not extracted_text:
        raise HTTPException(
            422,
            "No selectable text was found. Scanned PDFs are not supported yet.",
        )

    candidates = find_likely_lab_lines(extracted_text)

    return {
        "filename": file.filename,
        "page_count": page_count,
        "extracted_text": extracted_text,
        "candidate_results": candidates,
        "candidate_count": len(candidates),
        "status": "text_extracted",
        "limitations": [
            "Parsed results are candidates and require verification.",
            "Complex PDF layouts may associate values with the wrong test.",
            "Scanned PDFs are not supported yet.",
            "AI explanations and medical citations are not implemented yet.",
            "This endpoint does not diagnose or recommend treatment.",
        ],
    }
