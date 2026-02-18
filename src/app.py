from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, Depends, Response, status, Body
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles

from src.database import create_db_and_tables
from src.database import get_async_session
from src.model import Users, Connected_DataBases
from src.schemas import SignUpCreate, LogInSchema
from sqlalchemy.ext.asyncio import AsyncSession 
from sqlalchemy import select
from src.auth import get_password_hash, verify_password, create_access_token, create_refresh_token, decode_token
from jose import JWTError
import pyodbc
import uuid

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")


async def get_current_user(request: Request, session: AsyncSession = Depends(get_async_session)) -> Users:
    access = request.cookies.get("access_token")
    if not access:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        user_id = decode_token(access, expected_type="access")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid/expired token")

    try:
        uid = uuid.UUID(user_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user id in token")

    result = await session.execute(select(Users).where(Users.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user

@app.get("/", response_class=HTMLResponse)
async def home_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/pricing", response_class=HTMLResponse)
async def home_page(request: Request):
    return templates.TemplateResponse("pricing.html", {"request": request})

@app.get("/signup", response_class=HTMLResponse)
async def sign_up(request: Request):
    return templates.TemplateResponse("signup.html", {"request": request})

@app.get("/login", response_class=HTMLResponse)
async def log_in(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/database-connection", response_class=HTMLResponse)
async def database_connection(request: Request, user: Users = Depends(get_current_user)):
    return templates.TemplateResponse("database-connection.html", {"request": request, "user": user})

@app.get("/chat", response_class=HTMLResponse)
async def chat(request: Request, user: Users = Depends(get_current_user)):
    return templates.TemplateResponse("chat.html", {"request": request, "user": user})

@app.post("/signup")
async def signup_post(
    payload: SignUpCreate,
    session: AsyncSession = Depends(get_async_session)
):
    # check if email already exists
    result = await session.execute(select(Users).where(Users.email == payload.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # hashed = pwd_context.hash(payload.password)

    user = Users(
        firstname=payload.firstname,
        lastname=payload.lastname,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
    )

    session.add(user)
    await session.commit()
    await session.refresh(user)

    # IMPORTANT: return ok:true because your JS checks it
    return {"ok": True, "message": "Account created successfully"}

@app.post("/login")
async def login_post(
    payload: LogInSchema,
    response: Response,
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(select(Users).where(Users.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    access = create_access_token(sub=str(user.id))
    refresh = create_refresh_token(sub=str(user.id))

    # HttpOnly cookies (safe for Next + browser)
    response.set_cookie(
        key="access_token",
        value=access,
        httponly=True,
        samesite="lax",
        secure=False,  # True on HTTPS production
        max_age=60 * 15,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh,
        httponly=True,
        samesite="lax",
        secure=False,  # True on HTTPS production
        max_age=60 * 60 * 24 * 7,
        path="/",
    )

    return {"ok": True, "message": "Login successful"}


@app.post("/test-database-connection")
async def test_database_connection(
    db_type: str = Body(...),
    host: str = Body(...),
    port: int = Body(...),
    db_name: str = Body(...),
    username: str = Body(...),
    password: str = Body(...),
    current_user: Users = Depends(get_current_user),
):
    """
    Test if database connection works before saving
    """
    try:
        # Build connection string based on database type
        if db_type.lower() == "mysql":
            # MySQL connection string
            conn_str = f"DRIVER={{MySQL ODBC 8.0 Unicode Driver}};SERVER={host};PORT={port};DATABASE={db_name};USER={username};PASSWORD={password};"
        elif db_type.lower() == "postgresql":
            # PostgreSQL
            conn_str = f"DRIVER={{PostgreSQL Unicode}};SERVER={host};PORT={port};DATABASE={db_name};UID={username};PWD={password};"
        elif db_type.lower() == "mssql" or db_type.lower() == "sqlserver":
            # SQL Server
            conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={host},{port};DATABASE={db_name};UID={username};PWD={password};"
        else:
            return {"ok": False, "message": f"Unsupported database type: {db_type}"}

        # Try to connect
        conn = pyodbc.connect(conn_str, timeout=5)
        conn.close()

        return {"ok": True, "message": "Connection successful!"}

    except Exception as e:
        return {"ok": False, "message": f"Connection failed: {str(e)}"}

@app.post("/database-connection", status_code=status.HTTP_201_CREATED)
async def save_database_connection(
    db_type: str = Body(...),
    host: str = Body(...),
    port: int = Body(...),
    db_name: str = Body(...),
    username: str = Body(...),
    password: str = Body(...),
    current_user: Users = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    connection = Connected_DataBases(
        user_id=current_user.id,
        db_type=db_type,
        host=host,
        port=port,
        db_name=db_name,
        username=username,
        encrypted_password=password,
    )

    session.add(connection)
    await session.commit()
    await session.refresh(connection)

    return {"ok": True, "connection_id": connection.id}




@app.post("/refresh")
async def refresh_token(request: Request, response: Response):
    refresh = request.cookies.get("refresh_token")
    if not refresh:
        raise HTTPException(status_code=401, detail="No refresh token")

    try:
        user_id = decode_token(refresh, expected_type="refresh")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid/expired refresh token")

    new_access = create_access_token(sub=user_id)

    response.set_cookie(
        key="access_token",
        value=new_access,
        httponly=True,
        samesite="lax",
        secure=False,  # True on HTTPS production
        max_age=60 * 15,
        path="/",
    )

    return {"ok": True, "message": "Access token refreshed"}


@app.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True, "message": "Logged out"}


@app.get("/logout")
async def logout_get(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    # Redirecting would be nicer but keep simple JSON for now
    return {"ok": True, "message": "Logged out"}



