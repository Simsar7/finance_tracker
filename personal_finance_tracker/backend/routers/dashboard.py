from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import crud, schemas, models
from backend.utils import get_current_user
from datetime import date
from decimal import Decimal
from typing import Optional
from backend.crud import get_wallet_balance, get_savings_balance, get_borrow_summary, get_lend_summary, get_income_total, get_expense_total
router = APIRouter(
    tags=["Dashboard"]
)

def to_float_safe(value: Decimal | None) -> float:
    return float(value) if value is not None else 0.0

@router.get("/", response_model=schemas.DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    wallet_balance = crud.get_wallet_balance(db, current_user.id)
    savings_balance = crud.get_savings_balance(db, current_user.id)
    borrow_summary = crud.get_borrow_summary(db, current_user.id)
    lend_summary = crud.get_lend_summary(db, current_user.id)

    return schemas.DashboardSummary(
        wallet_balance=wallet_balance,
        savings_balance=savings_balance,
        borrow_wallet=borrow_summary["borrow_wallet"],
        borrow_savings=borrow_summary["borrow_savings"],
        lend_wallet=lend_summary["lend_wallet"],
        lend_savings=lend_summary["lend_savings"]
    )

@router.post("/repay", response_model=schemas.DashboardSummary)
def repay_borrow(
    repayment: schemas.RepaymentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Handle repayment of a borrow amount from either wallet or savings.
    Updates borrow remaining_amount, creates a Repayment record, and adjusts balances.
    """
    # Validate repayment
    if repayment.amount <= 0:
        raise HTTPException(status_code=400, detail="Repayment amount must be positive")
    if not repayment.borrow_id or repayment.lend_id:
        raise HTTPException(status_code=400, detail="Valid borrow_id must be provided without lend_id")

    # Check borrow exists and source matches
    borrow = crud.get_borrow_by_id(db, repayment.borrow_id, current_user.id)
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow not found")
    if borrow.remaining_amount < repayment.amount:
        raise HTTPException(status_code=400, detail="Repayment amount exceeds remaining borrow amount")
    if borrow.destination != repayment.source:
        raise HTTPException(status_code=400, detail="Repayment source must match borrow destination")

    # Check balance and create spend record accordingly
    if repayment.source == "wallet":
        wallet_balance = crud.get_wallet_balance(db, current_user.id)
        if wallet_balance < repayment.amount:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")

        # Create wallet spend record (expense)
        crud.create_wallet_spending(
            db,
            schemas.WalletSpendingCreate(
                user_id=current_user.id,
                amount=repayment.amount,
                type="spend",
                reason=f"Repayment for borrow ID {repayment.borrow_id}",
                date=date.today(),
                status="wallet"
            )
        )

    elif repayment.source == "savings":
        savings_balance = crud.get_savings_balance(db, current_user.id)
        if savings_balance < repayment.amount:
            raise HTTPException(status_code=400, detail="Insufficient savings balance")

        crud.create_saving(
            db,
            schemas.SavingCreate(
                user_id=current_user.id,
                amount=repayment.amount,
                type="spend",
                reason=f"Repayment for borrow ID {repayment.borrow_id}",
                date=date.today(),
                status="saving"
            )
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid repayment source")

    # Create repayment record
    repayment.date = repayment.date or date.today()
    crud.create_repayment(db, repayment, current_user.id)

    # Update borrow
    updated_remaining_amount = borrow.remaining_amount - repayment.amount
    if updated_remaining_amount <= 0:
        crud.update_borrow_status(db, repayment.borrow_id, current_user.id, "settled")
    else:
        crud.update_borrow_amount(db, repayment.borrow_id, current_user.id, updated_remaining_amount)

    db.commit()

    # Return updated dashboard summary
    wallet_balance = crud.get_wallet_balance(db, current_user.id)
    savings_balance = crud.get_savings_balance(db, current_user.id)
    borrow_summary = crud.get_borrow_summary(db, current_user.id)
    lend_summary = crud.get_lend_summary(db, current_user.id)

    return schemas.DashboardSummary(
        wallet_balance=to_float_safe(wallet_balance),
        savings_balance=to_float_safe(savings_balance),
        borrow_wallet=to_float_safe(borrow_summary["borrow_wallet"]),
        borrow_savings=to_float_safe(borrow_summary["borrow_savings"]),
        lend_wallet=to_float_safe(lend_summary["lend_wallet"]),
        lend_savings=to_float_safe(lend_summary["lend_savings"])
    )
@router.get("/dashboard/", response_model=schemas.Dashboard)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    wallet_balance = get_wallet_balance(db, current_user.id, start_date, end_date)
    savings_balance = get_savings_balance(db, current_user.id, start_date, end_date)
    borrow_summary = get_borrow_summary(db, current_user.id, start_date, end_date)
    lend_summary = get_lend_summary(db, current_user.id, start_date, end_date)
    income_total = get_income_total(db, current_user.id, start_date, end_date)
    expense_total = get_expense_total(db, current_user.id, start_date, end_date)
    
    return {
        "wallet_balance": wallet_balance,
        "savings_balance": savings_balance,
        "borrow_summary": borrow_summary,
        "lend_summary": lend_summary,
        "monthly_income": income_total,
        "monthly_expenses": expense_total
    }