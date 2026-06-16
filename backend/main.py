from fastapi import FastAPI, HTTPException
from backend.database import get_connection
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from passlib.hash import bcrypt
import mysql.connector

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserSignup(BaseModel):
    username: str
    flat_no: str
    phone_no: str
    password: str

@app.post("/signup")
def signup(user: UserSignup):
    conn = get_connection()
    cursor = conn.cursor()

    query = """
    INSERT INTO users(name, flat_number, phone_number, password_hash)
    VALUES(%s,%s,%s,%s)
    """

    try:
        hashed_password = bcrypt.hash(user.password)
        cursor.execute(query, (user.username, user.flat_no, user.phone_no, hashed_password))
        conn.commit()
    except mysql.connector.IntegrityError:
        raise HTTPException(status_code=400, detail="Flat number already registered")

    cursor.close()
    conn.close()
    return {"message": "User created"}


class LoginUser(BaseModel):
    flat_no: str
    password: str

@app.post("/login")
def login(user: LoginUser):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM users WHERE flat_number=%s", (user.flat_no,))
    result = cursor.fetchone()

    cursor.close()
    conn.close()

    if result and bcrypt.verify(user.password, result["password_hash"]):
        return {
            "success": True,
            "username": result["name"],
            "flat_no": result["flat_number"]
        }

    return {"success": False}


@app.get("/")
def home():
    return {"message": "Shelve backend is working 🚀"}


class Book(BaseModel):
    title: str
    author: str
    genre: str
    isbn: str
    owner_flat: str
    borrower_flat: str | None = None
    cover_url: str | None = None
    description: str | None = None

@app.post("/add")
def add(book: Book):
    conn = get_connection()
    cursor = conn.cursor()

    query = """
    INSERT INTO books(title, author, genre, isbn, owner_flat, status, borrower_flat, cover_url, description)
    VALUES (%s, %s, %s, %s, %s, 'available', %s, %s, %s)
    """

    cursor.execute(query, (
        book.title, book.author, book.genre, book.isbn,
        book.owner_flat, None, book.cover_url, book.description
    ))

    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Book added successfully"}


@app.get("/books")
def get_books():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM books")
    books = cursor.fetchall()
    cursor.close()
    conn.close()
    return books


@app.get("/books/search")
def get_book(name: str):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    search_term = f"%{name}%"
    cursor.execute(
        "SELECT * FROM books WHERE title LIKE %s OR author LIKE %s",
        (search_term, search_term)
    )
    books = cursor.fetchall()
    cursor.close()
    conn.close()
    return books


@app.get("/books/available")
def get_available():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM books WHERE status = %s", ('available',))
    books = cursor.fetchall()
    cursor.close()
    conn.close()
    return books


@app.get("/books/borrowed/{flat_no}")
def borrowed_books(flat_no: str):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM books WHERE borrower_flat = %s", (flat_no,))
    books = cursor.fetchall()
    cursor.close()
    conn.close()
    return books


@app.get("/books/genre/{selected_genre}")
def get_genre(selected_genre: str):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM books WHERE genre = %s", (selected_genre,))
    books = cursor.fetchall()
    cursor.close()
    conn.close()
    return books


@app.get("/user/{flat_no}")
def get_user(flat_no: str):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT name, phone_number, flat_number FROM users WHERE flat_number = %s",
        (flat_no,)
    )
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    return user


class StatusUpdate(BaseModel):
    isbn: str
    status: str
    borrower_flat: str | None = None
    owner_flat: str

@app.post("/books/update-status")
def update_status(data: StatusUpdate):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE books
        SET status = %s, borrower_flat = %s
        WHERE isbn = %s AND owner_flat = %s
    """, (data.status, data.borrower_flat, data.isbn, data.owner_flat))

    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Updated"}


# Note: specific routes must come BEFORE the generic /{isbn} route
@app.delete("/books/by-title/{title}")
def delete_book_by_title(title: str, owner_flat: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM books WHERE title = %s AND owner_flat = %s",
        (title, owner_flat)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Book deleted"}


@app.delete("/books/{isbn}")
def delete_book(isbn: str, owner_flat: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM books WHERE isbn = %s AND owner_flat = %s",
        (isbn, owner_flat)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Book deleted"}
