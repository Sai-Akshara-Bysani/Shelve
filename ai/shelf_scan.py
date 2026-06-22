from fastapi import APIRouter, UploadFile, File, HTTPException
from openai import OpenAI
from dotenv import load_dotenv
import base64
import json
import os

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

router = APIRouter()


@router.post("/scan-shelf")
async def scan_shelf(file: UploadFile = File(...)):

    # Check file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload an image file"
        )

    try:
        # Read image
        image_bytes = await file.read()

        # Convert to base64
        image_base64 = base64.b64encode(
            image_bytes
        ).decode("utf-8")

        response = client.responses.create(
            model="gpt-5",
            input=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": """
You are a book detection assistant.

Look at the bookshelf image.

Identify all visible book titles and authors.

Only include books that you can read with reasonable confidence.

Return ONLY valid JSON.

Format:

{
  "books": [
    {
      "title": "Book Title",
      "author": "Author Name"
    }
  ]
}
"""
                        },
                        {
                            "type": "input_image",
                            "image_url": f"data:{file.content_type};base64,{image_base64}"
                        }
                    ]
                }
            ]
        )

        raw_output = response.output_text.strip()

        try:
            books = json.loads(raw_output)
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "AI returned invalid JSON",
                "raw_response": raw_output
            }

        return {
            "success": True,
            "books": books.get("books", [])
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )