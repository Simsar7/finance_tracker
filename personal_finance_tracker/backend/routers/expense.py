from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from backend import crud, schemas
from backend.database import get_db
from backend.utils import get_current_user
from backend.models import User,Expense
from typing import List, Optional
from datetime import date
from backend.schemas import ExpenseUpdate


router = APIRouter(
   
    tags=["Expenses"]
)

# ✅ Create expense (user_id from logged-in user)
@router.post("/", response_model=schemas.Expense)
def create_expense(
    expense: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from decimal import Decimal

    # Get wallet balance
    return crud.create_expense(db, expense, user_id=current_user.id)

# ✅ Get all expenses of the logged-in user
@router.get("/", response_model=List[schemas.Expense])
def get_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud.get_expense_by_user(db, user_id=current_user.id)

# ✅ Optional filtering by date range and category
@router.get("/filter", response_model=List[schemas.Expense])
def get_expense_filtered(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud.get_expense_filtered(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        category=category
    )

# ✅ Get a single expense by ID (useful for editing)
@router.get("/{expense_id}", response_model=schemas.Expense)
def get_expense(
    expense_id: int = Path(..., description="ID of the expense"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_expense = crud.get_expense_by_id(db, expense_id)
    if not db_expense or db_expense.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Expense not found")
    return db_expense

# ✅ Update expense by ID
@router.put("/{expense_id}", response_model=schemas.Expense)
def update_expense(
    expense_id: int,
    expense_update: schemas.ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_expense = crud.update_expense(db, expense_id, expense_update, current_user.id)
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return db_expense
