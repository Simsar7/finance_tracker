from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from backend import crud, database
from backend.utils import create_access_token
from fastapi.security import OAuth2PasswordRequestForm
from backend.schemas import UserCreate  # This is fine as long as the class name matches
from fastapi.responses import JSONResponse
import traceback
from backend import schemas


router = APIRouter(
       # Base prefix for auth routes
    tags=["Users"]
)

# Dependency to get DB session
get_db = database.get_db

# Create User (Signup)

@router.post("/signup")
def signup_user(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        existing_user = crud.get_user_by_identifier(db, user_data.username)
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        new_user = crud.create_user(db, user_data)
        return {"message": "User created successfully"}
    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal Server Error")
# Get User by ID
@router.get("/user/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# Login User

@router.post("/login")
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        print(f"Logging in user: {form_data.username}")

        user = crud.authenticate_user(db, form_data.username, form_data.password)
        if not user:
            print("Authentication failed")
            raise HTTPException(status_code=401, detail="Invalid credentials")

        access_token = create_access_token(data={"sub": user.username})
        print(f"Generated access token: {access_token}")

        return {"access_token": access_token, "token_type": "bearer"}

    except Exception as e:
        import traceback
        traceback.print_exc()  # This prints full error trace to console/log
        raise HTTPException(status_code=500, detail="Internal Server Error")
