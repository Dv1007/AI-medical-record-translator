# Backend

From this directory, create and activate a virtual environment, install `requirements.txt`, then run:

```powershell
# Local development on port 8000
uvicorn app.main:app --reload --port 8000

# If port 8000 is already in use; Windows will expose port 8001
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# Gemini must be configured in the backend terminal/process
$env:GEMINI_API_KEY="your-key"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

<<<<<<< HEAD
The API listens at `http://localhost:8001`; interactive API docs are at `/docs`.
=======
The API can listen on port `8000` or `8001`; interactive API docs are at `/docs`. When the frontend runs on another computer, use `http://BACKEND-LAN-IP:PORT` and allow that port in Windows Firewall. For example: `http://192.168.1.25:8001`.
>>>>>>> 30188bc (Fix medical test explanations and add frontend)
