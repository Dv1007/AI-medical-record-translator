import os
from google import genai

if not os.getenv("GEMINI_API_KEY"):
    print("ERROR: GEMINI_API_KEY is not set.")
    raise SystemExit(1)

try:
    client = genai.Client()

    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents="Reply with exactly: Gemini connection successful.",
    )

    if response.text:
        print("SUCCESS: Gemini API connection works.")
        print("Gemini response:", response.text)
    else:
        print("ERROR: Gemini returned an empty response.")

except Exception as error:
    print("Gemini request failed.")
    print("Error type:", type(error).__name__)
    print("Check your API key, model access, and API quota.")
