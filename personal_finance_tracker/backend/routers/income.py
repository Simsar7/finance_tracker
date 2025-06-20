from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from backend import schemas, crud
from backend.database import get_db
from backend.utils import get_current_user
from backend.models import Income, User

router = APIRouter(
    tags=["Income"]
)

# Create income for the logged-in user
@router.post("/", response_model=schemas.Income, status_code=status.HTTP_201_CREATED)
def create_income(
    income: schemas.IncomeCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Step 1: If income is salary to wallet → transfer wallet balance first
    if income.source.lower() == "salary" and income.destination == "wallet":
        # Get wallet balance BEFORE salary
        wallet_balance = crud.get_wallet_balance(db, current_user.id)

        if wallet_balance > 0:
            # a) Debit existing wallet balance
            wallet_debit = Income(
                amount=-wallet_balance,
                source="Auto Transfer to Savings",
                date=datetime.now().date(),
                destination="wallet",
                user_id=current_user.id
            )
            db.add(wallet_debit)

            # b) Credit to savings
            saving_data = schemas.SavingCreate(
                amount=wallet_balance,
                source="Wallet Transfer",
                date=datetime.now().date(),
                type="auto",
                reason="Auto transfer before salary",
                user_id=current_user.id
            )
            crud.create_saving(db, saving_data)

            db.commit()

    # Step 2: Add new income (salary or any other)
    new_income = Income(**income.dict(), user_id=current_user.id)
    db.add(new_income)
    db.commit()
    db.refresh(new_income)

        # Auto-generate report if income is salary
    if income.source.lower() == "salary":
        from backend.crud import generate_summary_report, create_report

        summary_data = generate_summary_report(db, current_user.id)
        create_report(
            db=db,
            user_id=current_user.id,
            report_data=summary_data,  # this should be a list of dicts
            report_type="Salary Credit Auto Report",
            report_range=f"{datetime.now().strftime('%B %Y')}"
        )

    return new_income



# Get all incomes for the logged-in user
# Get all incomes for the logged-in user with filters
@router.get("/", response_model=List[schemas.Income])
def get_incomes_for_logged_in_user(
    source: str = None,
    from_date: str = None,
    to_date: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Income).filter(Income.user_id == current_user.id)
    
    if source and source.lower() != "all":
        query = query.filter(Income.source == source)
    
    if from_date:
        try:
            from_date_obj = datetime.strptime(from_date, "%Y-%m-%d").date()
            query = query.filter(Income.date >= from_date_obj)
        except ValueError:
            pass
    
    if to_date:
        try:
            to_date_obj = datetime.strptime(to_date, "%Y-%m-%d").date()
            query = query.filter(Income.date <= to_date_obj)
        except ValueError:
            pass
    
    return query.all()

# Update income by ID for logged-in user
@router.put("/{income_id}/", response_model=schemas.Income)
def update_income(
    income_id: int,
    income_data: schemas.IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    income_obj = db.query(Income).filter(Income.id == income_id, Income.user_id == current_user.id).first()
    if not income_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income record not found")

    income_obj.source = income_data.source
    income_obj.amount = income_data.amount
    income_obj.date = income_data.date

    db.commit()
    db.refresh(income_obj)
    return income_obj

# Delete income by ID for logged-in user
@router.delete("/{income_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    income_obj = db.query(Income).filter(Income.id == income_id, Income.user_id == current_user.id).first()
    if not income_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income record not found")

    db.delete(income_obj)
    db.commit()
    return
