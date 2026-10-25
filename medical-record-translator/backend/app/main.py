from io import BytesIO
import json
import os
import re

import fitz
from google import genai
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


app = FastAPI(title="AI Medical Record Translator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_PAGES = 100
MAX_RESULTS = 200
GEMINI_MODEL = "gemini-3.5-flash-lite"

DISCLAIMER = (
    "Educational information only. Extracted results are unverified "
    "and may be inaccurate. Confirm them against the original report "
    "and consult a qualified healthcare professional for interpretation. "
    "Automated range comparisons are not a medical diagnosis."
)

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
    rf"(?<![\w.])({NUMBER})\s*"
    rf"(?:-|[\u2010-\u2015\u2212]|\bto\b)\s*"
    rf"({NUMBER})(?![\w.])",
    re.IGNORECASE,
)

NUMBER_RE = re.compile(NUMBER)

UNIT_PATTERN = (
    r"mg/dL|g/dL|mmol/L|mEq/L|"
    r"10\^?\d+/(?:uL|µL|μL)|"
    r"10\^?\d+/L|"
    r"U/L|IU/L|mIU/L|"
    r"ng/mL|pg/mL|µg/dL|μg/dL|mcg/dL|"
    r"fL|pg|%|mmol/mol|"
    r"cells/(?:uL|µL|μL)|"
    r"mg/L|g/L|"
    r"seconds|sec|"
    r"mm/hr|mm/h"
)

UNIT_RE = re.compile(
    rf"^(?:{UNIT_PATTERN})$",
    re.IGNORECASE,
)

UNIT_SEARCH_RE = re.compile(
    rf"(?<![\w/])(?:{UNIT_PATTERN})(?![\w/])",
    re.IGNORECASE,
)


class LabResult(BaseModel):
    test_name: str = Field(min_length=1, max_length=100)
    value: str | None = Field(default=None, max_length=100)
    unit: str | None = Field(default=None, max_length=50)
    reference_range: str | None = Field(default=None, max_length=100)
    status: str = Field(default="candidate_unverified", max_length=50)


class ExplanationRequest(BaseModel):
    results: list[LabResult] = Field(
        min_length=1,
        max_length=MAX_RESULTS,
    )


def identify_test(line: str):
    """Identify a supported lab test in extracted PDF text."""
    for name, pattern in TEST_PATTERNS:
        match = re.search(pattern, line, re.IGNORECASE)
        if match:
            return name, match
    return None, None


def parse_value_line(line: str):
    """Parse a leading numeric value and optional trailing text."""
    match = re.fullmatch(
        rf"\s*({NUMBER})(?:\s+(.*?))?\s*",
        line.strip(),
    )
    if not match:
        return None, None

    return match.group(1), (match.group(2) or "").strip()


def extract_fields(text: str, test_match_end: int):
    """Extract possible value, unit, and reference range."""
    remainder = text[test_match_end:].replace("|", " ")
    remainder = remainder.replace("**", "").strip()

    range_match = RANGE_RE.search(remainder)
    reference_range = None

    if range_match:
        reference_range = (
            f"{range_match.group(1)}-{range_match.group(2)}"
        )
        remainder_without_range = (
            remainder[:range_match.start()]
            + " "
            + remainder[range_match.end():]
        )
    else:
        remainder_without_range = remainder

    unit_match = UNIT_SEARCH_RE.search(remainder_without_range)
    unit = unit_match.group(0) if unit_match else None

    value_text = remainder_without_range
    if unit_match:
        value_text = (
            value_text[:unit_match.start()]
            + " "
            + value_text[unit_match.end():]
        )

    value_match = NUMBER_RE.search(value_text)
    value = value_match.group(0) if value_match else None

    return value, unit, reference_range


def classify_candidate(
    value: str | None,
    unit: str | None,
    reference_range: str | None,
) -> str:
    """
    Compare a simple numeric result with a printed numeric range.

    This is a mechanical comparison, not a clinical interpretation.
    Ambiguous or incomplete information remains unverified.
    """
    if not value or not unit or not reference_range:
        return "unverified"

    value_match = re.fullmatch(
        r"\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*",
        value,
    )
    range_match = RANGE_RE.fullmatch(reference_range.strip())

    if not value_match or not range_match:
        return "unverified"

    try:
        number = float(value_match.group(1))
        lower = float(range_match.group(1))
        upper = float(range_match.group(2))
    except (ValueError, TypeError):
        return "unverified"

    if lower > upper:
        return "unverified"

    if not all(
        map(
            lambda n: abs(n) != float("inf") and n == n,
            [number, lower, upper],
        )
    ):
        return "unverified"

    if number < lower:
        return "low"
    if number > upper:
        return "high"
    return "normal"


def find_likely_lab_lines(text: str) -> list[dict]:
    """Find supported lab tests and mark extracted values for review."""
    lines = [" ".join(line.split()) for line in text.splitlines()]
    candidates = []
    i = 0

    while i < len(lines) and len(candidates) < MAX_RESULTS:
        line = lines[i]
        test_name, test_match = identify_test(line)

        if not test_name:
            i += 1
            continue

        test_line_number = i + 1
        source_lines = [line]

        value, unit, reference_range = extract_fields(
            line,
            test_match.end(),
        )

        if value is None or unit is None or reference_range is None:
            j = i + 1
            scan_limit = min(i + 8, len(lines))
            combined_text = line

            while j < scan_limit:
                next_line = lines[j]

                if next_line:
                    next_test, _ = identify_test(next_line)
                    if next_test:
                        break

                    source_lines.append(next_line)
                    combined_text += " " + next_line

                    value, unit, reference_range = extract_fields(
                        combined_text,
                        test_match.end(),
                    )

                    if (
                        value is not None
                        and unit is not None
                        and reference_range is not None
                    ):
                        j += 1
                        break

                j += 1

            i = max(i + 1, j)
        else:
            i += 1

        classification = classify_candidate(
            value,
            unit,
            reference_range,
        )

        candidates.append(
            {
                "test_name": test_name,
                "value": value,
                "unit": unit,
                "reference_range": reference_range,
                "classification": classification,
                "source_line": " | ".join(source_lines),
                "source_line_number": test_line_number,
                "needs_review": True,
                "status": (
                    "candidate_unverified"
                    if value is not None
                    else "incomplete_candidate"
                ),
            }
        )

    return candidates


def extract_pdf_contents(contents: bytes, filename: str) -> dict:
    """Validate a PDF and extract candidate laboratory results."""
    if not filename or not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file.",
        )

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="The PDF must be 10 MB or smaller.",
        )

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    try:
        with fitz.open(
            stream=BytesIO(contents),
            filetype="pdf",
        ) as doc:
            if doc.is_encrypted:
                raise HTTPException(
                    status_code=400,
                    detail="Password-protected PDFs are not supported.",
                )

            if not 1 <= doc.page_count <= MAX_PAGES:
                raise HTTPException(
                    status_code=400,
                    detail="The PDF must contain between 1 and 100 pages.",
                )

            page_count = doc.page_count
            extracted_text = "\n".join(
                page.get_text() for page in doc
            ).strip()

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not read this PDF. Please try another file.",
        )

    if not extracted_text:
        raise HTTPException(
            status_code=422,
            detail=(
                "No selectable text was found. "
                "Scanned PDFs are not supported yet."
            ),
        )

    candidates = find_likely_lab_lines(extracted_text)

    return {
        "filename": filename,
        "page_count": page_count,
        "extracted_text": extracted_text,
        "candidate_results": candidates,
        "candidate_count": len(candidates),
        "status": "text_extracted",
        "limitations": [
            "Parsed results are candidates and require verification.",
            "Complex PDF layouts may associate values with the wrong test.",
            "Scanned PDFs are not supported yet.",
            "Automated comparisons are not medical diagnoses.",
            "AI explanations are educational and may be inaccurate.",
            "This endpoint does not diagnose or recommend treatment.",
        ],
    }


def _normalize_test_name(value: str) -> str:
    """Normalize a test name for matching without punctuation or spaces."""
    return "".join(character.lower() for character in value if character.isalnum())


def _fallback_measures(test_name: str) -> str:
    """Return a general educational description for supported test names."""
    name = _normalize_test_name(test_name)

    descriptions = [
        (("hemoglobin", "hgb", "haemoglobin"),
         "Hemoglobin is a protein in red blood cells that carries oxygen throughout the body."),
        (("hematocrit", "hct", "haematocrit"),
         "Hematocrit measures the proportion of blood made up of red blood cells."),
        (("platelet", "plt"),
         "Platelet count measures blood components that help blood clot."),
        (("wbc", "whitebloodcell"),
         "White blood cell count measures cells that are part of the immune system."),
        (("rbc", "redbloodcell"),
         "Red blood cell count measures the cells that carry oxygen using hemoglobin."),
        (("glucose",),
         "Glucose is a type of sugar in the blood that the body uses for energy."),
        (("sodium",),
         "Sodium is an electrolyte that helps regulate fluid balance and supports nerve and muscle function."),
        (("potassium",),
         "Potassium is an electrolyte important for nerve signaling, muscle function, and heart rhythm."),
        (("creatinine",),
         "Creatinine is a waste product measured as one indicator used to assess kidney function."),
        (("cholesterol",),
         "Cholesterol is a fatty substance measured to help assess blood lipid levels."),
        (("tsh", "thyroidstimulatinghormone"),
         "TSH is a hormone used to help assess how the thyroid gland is functioning."),
        (("alt", "alanineaminotransferase"),
         "ALT is an enzyme measured as part of assessing liver health."),
        (("ast", "aspartateaminotransferase"),
         "AST is an enzyme found in several tissues and measured as part of assessing liver and other tissue health."),
        (("calcium",),
         "Calcium is a mineral important for bones, nerve signaling, and muscle function."),
    ]

    for keys, description in descriptions:
        if any(key in name for key in keys):
            return description

    return (
        f"{test_name} is a laboratory test. Its specific purpose should be "
        "confirmed using the report's accompanying information or with a "
        "qualified healthcare professional."
    )


def generate_explanation(results: list[dict]) -> dict:
    """Generate a summary and one usable educational explanation per test."""
    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        test_explanations = []
        for result in results:
            name = str(result.get("test_name", "Unidentified test"))
            value = result.get("value")
            unit = result.get("unit")
            reference_range = result.get("reference_range")
            classification = result.get("classification")

            if value is not None and unit and reference_range:
                meaning = (
                    f"The extracted value is {value} {unit}, and the printed "
                    f"reference range is {reference_range}. The automated "
                    f"comparison labels it {classification or 'unverified'}; "
                    "confirm it against the original report."
                )
            else:
                meaning = (
                    "The extracted information is incomplete or could not be "
                    "compared reliably with a printed reference range. Confirm "
                    "the details against the original report."
                )

            test_explanations.append({
                "test_name": name,
                "measures": _fallback_measures(name),
                "meaning": meaning,
            })

        summary = (
            f"Educational summaries were prepared for {len(results)} "
            "extracted candidate result(s)."
        )
        limitations = (
            "Extracted results may be inaccurate and Gemini is not configured. "
            "Reference ranges vary by laboratory and patient context. This tool "
            "does not diagnose conditions or recommend treatment."
        )
        questions = []
        explanation = (
            f"Summary\n{summary}\n\nLimitations\n{limitations}"
        )

        return {
            "explanation": explanation,
            "summary": summary,
            "test_explanations": test_explanations,
            "limitations": limitations,
            "questions": questions,
            "status": "fallback",
            "disclaimer": DISCLAIMER,
        }

    prompt = f"""
You explain laboratory report terminology in plain English for
educational purposes.

Extracted candidate results:
{json.dumps(results, ensure_ascii=False)}

Safety and accuracy requirements:
- Treat all extracted values as potentially incorrect.
- Never invent or fill in missing values, units, ranges, or patient details.
- Explain what each test generally measures.
- Discuss a range comparison only when the value and supplied range
  are present and can be compared reliably.
- A supplied classification is a mechanical comparison, not a diagnosis.
- If a range or unit is missing, clearly explain the limitation.
- Explain that reference ranges vary by laboratory and patient context.
- Do not diagnose diseases or claim a result proves a condition.
- Do not prescribe medication or recommend changing treatment.
- Do not assume patient age, symptoms, history, or medications.
- Use calm, accessible language without unnecessary alarm.
- Do not present the explanation as a substitute for medical care.

Return ONLY valid JSON with this structure:
{{
  "summary": "Concise overall summary of extraction and limitations.",
  "tests": [
    {{
      "test_name": "Exact test name from the input",
      "measures": "What this test generally measures in plain English.",
      "meaning": "What can and cannot be said about this result."
    }}
  ],
  "limitations": "Important limitations of extraction and interpretation.",
  "questions": [
    "A reasonable question to ask a healthcare professional."
  ]
}}

Include exactly one tests entry for every input result.
Preserve the supplied test names. Do not invent results or ranges.
Do not include Markdown code fences.
"""

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={
                "http_options": {
                    "timeout": 30000,
                },
                "response_mime_type": "application/json",
            },
        )

        raw = response.text

        if not raw or not raw.strip():
            raise HTTPException(
                status_code=502,
                detail="The AI returned an empty explanation.",
            )

        parsed = json.loads(raw)

        if not isinstance(parsed, dict):
            raise HTTPException(
                status_code=502,
                detail="The AI returned an invalid explanation format.",
            )

        test_explanations = parsed.get("tests")
        if not isinstance(test_explanations, list):
            raise HTTPException(
                status_code=502,
                detail="The AI did not return test-specific explanations.",
            )

        explanation_by_name = {}
        for item in test_explanations:
            if not isinstance(item, dict):
                continue
            item_name = item.get("test_name") or item.get("name")
            if isinstance(item_name, str) and item_name.strip():
                explanation_by_name[_normalize_test_name(item_name)] = item

        aligned_explanations = []
        for index, result in enumerate(results):
            name = str(result.get("test_name", "Unidentified test"))
            item = explanation_by_name.get(_normalize_test_name(name), {})

            # If the model changed a test name, use the matching position
            # only when that response entry is a dictionary.
            if not item and index < len(test_explanations):
                positional_item = test_explanations[index]
                if isinstance(positional_item, dict):
                    item = positional_item

            measures = item.get("measures") or item.get("what_it_measures")
            if not isinstance(measures, str) or not measures.strip():
                measures = _fallback_measures(name)

            meaning = (
                item.get("meaning")
                or item.get("result_analysis")
                or item.get("analysis")
            )
            if not isinstance(meaning, str) or not meaning.strip():
                value = result.get("value")
                unit = result.get("unit")
                reference_range = result.get("reference_range")
                classification = result.get("classification")

                if value is not None and unit and reference_range:
                    meaning = (
                        f"The extracted value is {value} {unit}, and the "
                        f"printed reference range is {reference_range}. "
                        f"The automated comparison labels it "
                        f"{classification or 'unverified'}. Confirm the "
                        "value, unit, and range against the original report. "
                        "This is educational information, not a diagnosis."
                    )
                else:
                    meaning = (
                        "The extracted information is incomplete or could "
                        "not be compared reliably with a printed reference "
                        "range. Confirm the details against the original "
                        "report with a qualified healthcare professional."
                    )

            aligned_explanations.append(
                {
                    "test_name": name,
                    "measures": measures.strip(),
                    "meaning": meaning.strip(),
                }
            )

        summary = parsed.get("summary")
        if not isinstance(summary, str) or not summary.strip():
            summary = (
                f"Educational explanations were prepared for "
                f"{len(results)} extracted candidate result(s). Confirm "
                "all extracted details against the original report."
            )

        limitations = parsed.get("limitations")
        if not isinstance(limitations, str) or not limitations.strip():
            limitations = (
                "Extracted results may be inaccurate. Reference ranges vary "
                "by laboratory and patient context. This tool does not "
                "diagnose conditions or recommend treatment."
            )

        questions = parsed.get("questions", [])
        if not isinstance(questions, list):
            questions = []
        questions = [str(question) for question in questions if str(question).strip()]

        explanation = (
            f"Summary\n{summary}\n\n"
            f"Limitations\n{limitations}\n\n"
            "Questions to ask a healthcare professional\n"
            + "\n".join(f"- {question}" for question in questions)
        )

        return {
            "explanation": explanation,
            "summary": summary,
            "test_explanations": aligned_explanations,
            "limitations": limitations,
            "questions": questions,
            "status": "generated",
            "disclaimer": DISCLAIMER,
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=502,
            detail=(
                "The AI explanation could not be generated. "
                "Please try again later."
            ),
        )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/reports/extract")
async def extract_report(file: UploadFile = File(...)):
    contents = await file.read(MAX_FILE_SIZE + 1)
    return extract_pdf_contents(contents, file.filename or "")


@app.post("/api/reports/explain")
def explain_report(request: ExplanationRequest):
    results = [result.model_dump() for result in request.results]
    return generate_explanation(results)


@app.post("/api/reports/analyze")
async def analyze_report(file: UploadFile = File(...)):
    """Extract a PDF and return candidate results plus AI explanations."""
    contents = await file.read(MAX_FILE_SIZE + 1)
    extracted = extract_pdf_contents(contents, file.filename or "")

    candidates = extracted["candidate_results"]

    if candidates:
        explanation_result = generate_explanation(candidates)
    else:
        explanation_result = {
            "explanation": (
                "No candidate laboratory results were identified. "
                "Check that the PDF contains selectable text and a supported layout."
            ),
            "summary": "No candidate laboratory results were identified.",
            "test_explanations": [],
            "limitations": (
                "The PDF may have an unsupported layout or contain no recognizable results."
            ),
            "questions": [],
            "status": "not_generated",
            "disclaimer": DISCLAIMER,
        }

    return {
        **extracted,
        "explanation": explanation_result["explanation"],
        "summary": explanation_result["summary"],
        "test_explanations": explanation_result["test_explanations"],
        "explanation_limitations": explanation_result["limitations"],
        "questions": explanation_result["questions"],
        "explanation_status": explanation_result["status"],
        "disclaimer": explanation_result["disclaimer"],
    }
