from fastapi import FastAPI
from backend.database import get_connection
from pydantic import BaseModel

app = FastAPI()

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
    INSERT INTO users(username,flat_no,phone_no,password)
    VALUES(%s,%s,%s,%s)
    """

    cursor.execute(
        query,
        (user.username, user.flat_no, user.phone_no, user.password)
    )

    conn.commit()

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
    WHERE flat_no=%s AND password=%s
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
            "username": result["username"]
        }

    return {
        "success": False
    }
