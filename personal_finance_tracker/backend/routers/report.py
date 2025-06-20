from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from backend import crud, schemas, models
from backend.database import get_db
from backend.utils import get_current_user  # Adjust import to your project structure

router = APIRouter(
      # keep /reports prefix to stay consistent
    tags=["reports"],
)

@router.post("/", response_model=schemas.Report)
def create_new_report(report: schemas.ReportCreate, db: Session = Depends(get_db)):
    user_id = 1  # keep or update later to use auth
    return crud.create_report(
        db,
        user_id=user_id,
        report_data=report.report_data,
        report_type=report.report_type
    )

@router.get("/user/{user_id}", response_model=List[schemas.Report])
def get_reports(user_id: int, db: Session = Depends(get_db)):
    reports = crud.get_reports_by_user(db, user_id)
    if not reports:
        raise HTTPException(status_code=404, detail="Reports not found")
    return reports


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Example: Replace with your actual logic, e.g. from your income/expense tables
    total_income = sum(income.amount for income in current_user.incomes)
    total_expenses = sum(expense.amount for expense in current_user.expenses)
    savings = total_income - total_expenses

    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "savings": savings
    }
