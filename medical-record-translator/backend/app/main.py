
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


@app.get("/health")
def health():
    return {"status": "ok"}


def find_likely_lab_lines(text: str) -> list[dict]:
    """Find candidate lab-result lines without claiming they are verified."""
    candidates = []

    # Deliberately conservative: identify lines containing common test names
    # and numeric values. This is not a complete medical-report parser.
    test_names = (
        "WBC", "RBC", "Hemoglobin", "Haemoglobin", "Hematocrit",
        "Platelets", "Glucose", "Sodium", "Potassium", "Creatinine",
        "Cholesterol", "TSH", "ALT", "AST", "Calcium",
    )

    for line in text.splitlines():
        cleaned = " ".join(line.split())
        if not cleaned or len(cleaned) > 300:
            continue

        if any(
            re.search(rf"\b{re.escape(name)}\b", cleaned, re.IGNORECASE)
            for name in test_names
        ) and re.search(r"\d", cleaned):
            candidates.append({
                "text": cleaned,
                "needs_review": True,
                "note": "Candidate line; verify the value, unit, and reference range.",
            })

    return candidates[:100]


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
                raise HTTPException(400, "Password-protected PDFs are not supported.")

            if doc.page_count < 1 or doc.page_count > MAX_PAGES:
                raise HTTPException(400, "The PDF must contain 1–100 pages.")

            page_count = doc.page_count
            extracted_text = "\n".join(page.get_text() for page in doc).strip()

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(400, "Could not read this PDF. Please try another file.")

    if not extracted_text:
        raise HTTPException(
            422,
            "No selectable text was found. Scanned PDFs are not supported in this demo.",
        )

    candidates = find_likely_lab_lines(extracted_text)

    return {
        "filename": file.filename,
        "page_count": page_count,
        "extracted_text": extracted_text,
        "candidate_results": candidates,
        "status": "text_extracted",
        "message": (
            "Text was extracted. Candidate results have not been verified. "
            "No diagnosis or treatment recommendation has been generated."
        ),
    }
