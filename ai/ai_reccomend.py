from fastapi import APIRouter
from pydantic import BaseModel
from dotenv import load_dotenv
from backend.database import get_connection
import requests
import os
import json

load_dotenv()

router = APIRouter()

# Free, hosted, OpenAI-compatible — sign up at https://console.groq.com (no card needed)
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
            "response_format": {"type": "json_object"},  # forces valid JSON back
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


class RecommendationRequest(BaseModel):
    prompt: str


@router.post("/recommend")
def recommend(data: RecommendationRequest):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT title, author, genre, description
        FROM books
        WHERE status='available'
    """)

    books = cursor.fetchall()

    cursor.close()
    conn.close()

    if not books:
        return {
            "message": "No books available"
        }

    book_list = ""

    for book in books:
        book_list += f"""
Title: {book['title']}
Author: {book['author']}
Genre: {book['genre']}
Description: {book.get('description') or 'No description'}

"""

    prompt = f"""
You are a librarian.

Available books:

{book_list}

User request:

{data.prompt}

Recommend up to 5 books.

ONLY choose books from the available list.

Return ONLY JSON in this exact shape, nothing else:

{{
    "recommended_books": [
        "Harry Potter",
        "Percy Jackson"
    ]
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
        recommendations = json.loads(raw_output)
    except json.JSONDecodeError:
        return {
            "error": "Invalid AI response",
            "raw": raw_output
        }

    recommended_titles = recommendations.get(
        "recommended_books",
        []
    )

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    results = []

    for title in recommended_titles:

        cursor.execute(
            """
            SELECT *
            FROM books
            WHERE title = %s
            """,
            (title,)
        )

        book = cursor.fetchone()

        if book:
            results.append(book)

    cursor.close()
    conn.close()

    return {
        "recommendations": results
    }
