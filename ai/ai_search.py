from fastapi import APIRouter
from pydantic import BaseModel
from dotenv import load_dotenv
from backend.database import get_connection
import requests
import os
import json

load_dotenv()

router = APIRouter()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


def ask_groq(prompt: str) -> str:
    """Send a prompt to Groq's hosted API and return the raw text reply."""
    response = requests.post(
        GROQ_URL,
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


class AISearch(BaseModel):
    query: str


@router.post("/ai-search")
def ai_search(data: AISearch):

    prompt = f"""
    You are extracting book search filters.

    Request:
    {data.query}

    Return ONLY valid JSON.

    Possible fields:

    {{
        "title": "string",
        "author": "string",
        "genre": "string",
        "available": true,
        "borrowed": true
    }}

    Examples:

    Request:
    available fantasy books

    Response:
    {{
        "genre": "Fantasy",
        "available": true
    }}

    Request:
    books by Tolkien

    Response:
    {{
        "author": "Tolkien"
    }}

    Request:
    Dune

    Response:
    {{
        "title": "Dune"
    }}
    """

    try:
        raw_output = ask_groq(prompt)
    except requests.exceptions.RequestException as e:
        return {
            "error": "Could not reach the AI model",
            "detail": str(e)
        }

    try:
        filters = json.loads(raw_output)
    except json.JSONDecodeError:
        return {
            "error": "AI returned invalid JSON",
            "raw_response": raw_output
        }

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    sql = "SELECT * FROM books WHERE 1=1"
    params = []

    if "title" in filters:
        sql += " AND title LIKE %s"
        params.append(f"%{filters['title']}%")

    if "author" in filters:
        sql += " AND author LIKE %s"
        params.append(f"%{filters['author']}%")

    if "genre" in filters:
        sql += " AND genre = %s"
        params.append(filters["genre"])

    if filters.get("available"):
        sql += " AND status = 'available'"

    if filters.get("borrowed"):
        sql += " AND status = 'borrowed'"

    cursor.execute(sql, tuple(params))

    books = cursor.fetchall()

    cursor.close()
    conn.close()

    return {
        "filters": filters,
        "results": books
    }
