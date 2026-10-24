"""Minimal API for safe PDF text extraction."""

from io import BytesIO

import fitz
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AI Medical Record Translator API",
    version="0.1.0",
    description="Phase 1 API: extract selectable text from PDF lab reports.",
)

# Local Vite development server. Restrict origins before deploying this service.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

MAX_UPLOAD_BYTES = 20 * 1024 * 1024


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/extract")
async def extract_pdf(file: UploadFile = File(...)) -> dict[str, object]:
    """Extract text from a selectable-text PDF; scanned PDFs need OCR (later phase)."""
    if file.content_type != "application/pdf" and not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Please upload a PDF file.")

    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="PDF must be 20 MB or smaller.")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid PDF.")

    try:
        with fitz.open(stream=BytesIO(content), filetype="pdf") as document:
            if document.is_encrypted:
                raise HTTPException(status_code=400, detail="Password-protected PDFs are not supported.")
            pages = [page.get_text("text").strip() for page in document]
    except HTTPException:
        raise
    except (fitz.FileDataError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="The PDF could not be read.") from exc

    extracted_text = "\n\n".join(text for text in pages if text)
    if not extracted_text:
        raise HTTPException(
            status_code=422,
            detail="No selectable text was found. Scanned PDFs require OCR, which is not available yet.",
        )

    return {
        "filename": file.filename or "report.pdf",
        "page_count": len(pages),
        "text": extracted_text,
        "disclaimer": "Text extraction only. This application does not interpret results or provide medical advice.",
    }
