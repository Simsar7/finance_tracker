from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

from backend import schemas, crud, database

# Constants
SECRET_KEY = "d9f8e7c3a2b4f1e6d0c8b9a7e5f3d1c2"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme instance to extract token from request header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Dependency to get DB session
get_db = database.get_db

# Function to create JWT access token
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Password verification helper
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Password hashing helper
def get_password_hash(password):
    return pwd_context.hash(password)

# Dependency to get current user from token

async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> schemas.User:
    print("Token received:", token)  # debug log
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print("Decoded payload:", payload)  # debug log
        username: str = payload.get("sub")
        if username is None:
            print("No username found in token payload")
            raise credentials_exception
    except JWTError as e:
        print("JWTError:", e)  # debug log
        raise credentials_exception
    
    user = crud.get_user_by_identifier(db, identifier=username)
    print("User fetched from DB:", user)  # debug log
    
    if user is None:
        print("User not found in DB")
        raise credentials_exception
    
    return user

from decimal import Decimal

def get_repayment_status(remaining_amount: Decimal) -> str:
    return "pending" if remaining_amount > 0 else "settled"
