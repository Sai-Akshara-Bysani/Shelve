from fastapi import FastAPI
from backend.database import get_connection
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
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

    from fastapi import HTTPException
    import mysql.connector

    try:
        cursor.execute(
            query,
            (user.username, user.flat_no, user.phone_no, user.password)
        )
        conn.commit()

    except mysql.connector.IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Flat number already registered"
        )

    cursor.close()
    conn.close()

    return {"message": "User created"}

class LoginUser(BaseModel):
    flat_no: str
    password: str

@app.post("/login")
def login(user : LoginUser):
    
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
    SELECT * FROM users
    WHERE flat_number=%s AND password_hash=%s
    """

    cursor.execute(
        query,
        (user.flat_no, user.password)
    )

    result = cursor.fetchone()

    cursor.close()
    conn.close()

    if result:
        return {
            "success": True,
            "username": result["name"],
            "flat_no": result["flat_number"]
        }

    return {
        "success": False
    }

@app.get("/")
def home():
    return {"message": "Shelve backend is working 🚀"}

class Book(BaseModel):
    title: str
    author: str
    genre: str
    isbn: str
    owner_flat: str

@app.post("/add")
def add(book : Book):

    conn = get_connection();
    cursor = conn.cursor();

    query = """
    INSERT INTO books(title, author, genre, isbn, owner_flat, status)
    VALUES (%s, %s, %s, %s, %s, 'available')
    """

    cursor.execute(
        query,
        (book.title, book.author, book.genre, book.isbn, book.owner_flat)
    )

    conn.commit()

    cursor.close()
    conn.close()

    return {
        "message": "Book added successfully"
    }

@app.get("/books")
def get_books():
    conn = get_connection();
    cursor = conn.cursor(dictionary=True);

    query="""
    SELECT * FROM books
    """

    cursor.execute(query);

    books = cursor.fetchall();

    cursor.close();
    conn.close();
    return books;

@app.get("/books/genre/{selected_genre}")
def get_genre(selected_genre : str):
    conn = get_connection();
    cursor = conn.cursor(dictionary=True);

    query="""  
    SELECT * FROM books
    WHERE genre = %s
    """

    cursor.execute(query, (selected_genre,));

    books = cursor.fetchall();

    cursor.close();
    conn.close();
    return books;


@app.get("/books/available")
def get_available():
    conn = get_connection();
    cursor = conn.cursor();

    query = """
    SELECT * FROM books
    WHERE status = %s
    """

    cursor.execute(query, ('available',));

    books = cursor.fetchall();

    cursor.close();
    conn.close();
    return books;

@app.get("/books/search")
def get_available(name : str):
    conn = get_connection();
    cursor = conn.cursor(dictionary=True);

    query = """
    SELECT * FROM books
    WHERE title LIKE %s OR author LIKE %s
    """

    search_term = f"%{name}%"

    cursor.execute(query, (search_term, search_term));

    books = cursor.fetchall();

    cursor.close();
    conn.close();
    return books;
