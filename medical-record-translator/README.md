# AI Medical Record Translator — Phase 1

Phase 1 contains a FastAPI service that extracts selectable text from uploaded PDFs and a React dashboard shell with drag and drop upload. It does not parse lab values, call an LLM, or provide medical interpretation. Scanned PDFs are reported as unsupported until OCR is added.

## Structure

```text
medical-record-translator/
├── backend/
│   ├── app/main.py
│   └── requirements.txt
└── frontend/
    ├── src/App.jsx
    ├── src/main.jsx
    ├── src/styles.css
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## Run locally

In one terminal, from `backend`, install dependencies and start `uvicorn app.main:app --reload` (API at `http://localhost:8000`). In another, from `frontend`, run `npm install` and `npm run dev` (UI at `http://localhost:5173`). Vite proxies `/api` requests to FastAPI.

Uploads are capped at 20 MB. The local CORS origin is limited to the Vite development server; configure the allowed origin and add appropriate authentication, rate limits, retention controls, and deployment security before handling real patient data.
