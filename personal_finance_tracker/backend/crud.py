from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime
from typing import List, Optional, Literal
from backend.utils import pwd_context
from . import models, schemas
from .models import Report
from uuid import uuid4
import os
from backend.routers.borrow import get_pending_borrows
from backend.routers.lend import get_pending_lends
from backend.models import User as DBUser  # Adjust if needed
from passlib.context import CryptContext
from backend.schemas import UserCreate
from backend.models import Saving
from fastapi import HTTPException, status
from decimal import Decimal
import csv
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# -------- USERS --------
def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_identifier(db: Session, identifier: str) -> Optional[models.User]:
    return db.query(models.User).filter(
        (models.User.username == identifier) | (models.User.email == identifier)
    ).first()

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, identifier: str, password: str) -> Optional[models.User]:
    user = get_user_by_identifier(db, identifier)
    if not user:
        return None
    if not pwd_context.verify(password, user.password):
        return None
    return user


# -------- INCOME --------
def create_income(db: Session, income: schemas.IncomeCreate, user_id: int) -> models.Income:
    income_data = income.dict()

    # Parse date
    if isinstance(income_data["date"], str):
        try:
            income_data["date"] = datetime.strptime(income_data["date"], "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    # Validate amount
    if income_data["amount"] < 0:
        raise HTTPException(status_code=400, detail="Income amount must be non-negative.")

    # Update wallet or savings balance
    if income.destination == "wallet":
        wallet = db.query(models.Wallet).filter(models.Wallet.user_id == user_id).first()
        if not wallet:
            wallet = models.Wallet(user_id=user_id, balance=0)
            db.add(wallet)
            db.commit()
            db.refresh(wallet)
        wallet.balance += income.amount
        db.commit()
    elif income.destination == "savings":
        savings = db.query(models.Savings).filter(models.Savings.user_id == user_id).first()
        if not savings:
            savings = models.Savings(user_id=user_id, balance=0)
            db.add(savings)
            db.commit()
            db.refresh(savings)
        savings.balance += income.amount
        db.commit()
    else:
        raise HTTPException(status_code=400, detail="Invalid destination. Use 'wallet' or 'savings'.")

    # Create the income record
    db_income = models.Income(**income_data, user_id=user_id)
    db.add(db_income)
    db.commit()
    db.refresh(db_income)

    return db_income

def get_income_by_user(db: Session, user_id: int) -> List[models.Income]:
    return db.query(models.Income).filter(models.Income.user_id == user_id).all()

def get_income_filtered(db: Session, user_id: int, start_date: Optional[date], end_date: Optional[date]) -> List[models.Income]:
    query = db.query(models.Income).filter(models.Income.user_id == user_id)
    if start_date:
        query = query.filter(models.Income.date >= start_date)
    if end_date:
        query = query.filter(models.Income.date <= end_date)
    return query.all()


# -------- EXPENSES --------
def create_expense(db: Session, expense: schemas.ExpenseCreate, user_id: int) -> models.Expense:
    # Compute wallet balance using dashboard logic
    available_balance = Decimal(str(get_wallet_balance(db, user_id)))

    # Check balance
    if available_balance < expense.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance in wallet.")

    # Create expense
    db_expense = models.Expense(**expense.dict(), user_id=user_id)
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    
    return db_expense



def get_expense_by_id(db: Session, expense_id: int) -> Optional[models.Expense]:
    return db.query(models.Expense).filter(models.Expense.id == expense_id).first()

def get_expense_by_user(db: Session, user_id: int) -> List[models.Expense]:
    return db.query(models.Expense).filter(models.Expense.user_id == user_id).all()

def update_expense(db: Session, expense_id: int, expense_update: schemas.ExpenseUpdate, user_id: int) -> Optional[models.Expense]:
    db_expense = get_expense_by_id(db, expense_id)
    if not db_expense or db_expense.user_id != user_id:
        return None
    update_data = expense_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_expense, key, value)
    db.commit()
    db.refresh(db_expense)
    return db_expense


from datetime import datetime, date
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from backend import models, schemas


# -------- BORROW --------
def create_borrow(db: Session, borrow: schemas.BorrowCreate, user_id: int) -> models.Borrow:
    borrow_data = borrow.dict()

    # Parse date if string
    if isinstance(borrow_data.get("date"), str):
        try:
            borrow_data["date"] = datetime.strptime(borrow_data["date"], "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    amount = Decimal(str(borrow_data["amount"]))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Borrow amount must be positive.")

    destination = borrow_data.get("destination")

    if destination == "wallet":
        wallet = db.query(models.Wallet).filter(models.Wallet.user_id == user_id).first()
        if not wallet:
            wallet = models.Wallet(user_id=user_id, balance=Decimal("0.00"))
            db.add(wallet)
            db.flush()
        wallet.balance += amount

    elif destination == "savings":
        savings = db.query(models.Savings).filter(models.Savings.user_id == user_id).first()
        if not savings:
            savings = models.Savings(user_id=user_id, balance=Decimal("0.00"))
            db.add(savings)
            db.flush()
        savings.balance += amount

    else:
        raise HTTPException(status_code=400, detail="Invalid destination. Use 'wallet' or 'savings'.")

    db_borrow = models.Borrow(
        **borrow_data,
        user_id=user_id,
        status="pending",
        remaining_amount=amount
    )
    db.add(db_borrow)
    db.commit()
    db.refresh(db_borrow)

    # ✅ Add Income record for this borrow
    income = models.Income(
        user_id=user_id,
        amount=amount,
        source=f"Borrow from {borrow.person}",
        date=borrow_data["date"],
        destination=destination,
        notes=borrow.description or None
    )
    db.add(income)
    db.commit()

    return db_borrow



def get_borrows_by_user(db: Session, user_id: int) -> List[models.Borrow]:
    return db.query(models.Borrow).filter(models.Borrow.user_id == user_id).order_by(models.Borrow.date.desc()).all()


def get_borrows_filtered(db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None) -> List[models.Borrow]:
    query = db.query(models.Borrow).filter(models.Borrow.user_id == user_id)
    if start_date:
        query = query.filter(models.Borrow.date >= start_date)
    if end_date:
        query = query.filter(models.Borrow.date <= end_date)
    return query.order_by(models.Borrow.date.desc()).all()


def delete_borrow(db: Session, borrow_id: int, user_id: int):
    borrow = db.query(models.Borrow).filter(models.Borrow.id == borrow_id, models.Borrow.user_id == user_id).first()
    if borrow:
        db.delete(borrow)
        db.commit()
    else:
        raise HTTPException(status_code=404, detail="Borrow record not found")


def update_borrow(
    db: Session,
    borrow_id: int,
    borrow_data: schemas.BorrowUpdate,
    user_id: int
) -> models.Borrow:
    borrow = db.query(models.Borrow).filter(
        models.Borrow.id == borrow_id,
        models.Borrow.user_id == user_id
    ).first()

    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow record not found")

    updated_fields = borrow_data.dict(exclude_unset=True)
    old_amount = borrow.amount
    new_amount = Decimal(str(updated_fields.get("amount", old_amount)))

    # Update wallet balance if amount has changed
    if new_amount != old_amount:
        # Recalculate wallet balance
        wallet = db.query(models.Wallet).filter(models.Wallet.user_id == user_id).first()
        if not wallet:
            wallet = models.Wallet(user_id=user_id, balance=Decimal("0.00"))
            db.add(wallet)
            db.flush()

        # Remove old amount, add new one
        wallet.balance -= old_amount
        wallet.balance += new_amount

        # Adjust remaining amount based on repayments made
        repaid = old_amount - Decimal(str(borrow.remaining_amount))

        borrow.remaining_amount = max(new_amount - repaid, Decimal("0.00"))

    # Update other fields
    for key, value in updated_fields.items():
        setattr(borrow, key, value)

    db.commit()
    db.refresh(borrow)
    return borrow


def get_borrow_by_id(db: Session, borrow_id: int, user_id: int) -> Optional[models.Borrow]:
    return db.query(models.Borrow).filter(models.Borrow.id == borrow_id, models.Borrow.user_id == user_id).first()


# -------- LEND --------
def create_lend(db: Session, lend: schemas.LendCreate, user_id: int) -> models.Lend:
    lend_data = lend.dict()

    # Validate and parse date
    if isinstance(lend_data["date"], str):
        try:
            lend_data["date"] = datetime.strptime(lend_data["date"], "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    amount = Decimal(str(lend_data["amount"]))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Lend amount must be positive.")

    # Create transaction record based on source
    transaction_description = f"Lent to {lend_data.get('person', 'unknown')}"
    if lend_data.get('note'):
        transaction_description += f": {lend_data['note']}"

    if lend_data.get("source") == "wallet":
        # Only create expense (which should handle wallet deduction)
        db_transaction = models.Expense(
            user_id=user_id,
            amount=amount,
            category="Lend",
            date=lend_data["date"],
            description=transaction_description
        )
    elif lend_data.get("source") == "savings":
        # Only create saving record (which should handle savings deduction)
        db_transaction = models.Saving(
            user_id=user_id,
            amount=amount,  # Negative for withdrawal
            type="spend",
            reason=transaction_description,
            date=lend_data["date"],
            status="completed",
            created_at=datetime.utcnow()
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid source. Use 'wallet' or 'savings'.")

    # Create both records in a single transaction
    db_lend = models.Lend(**lend_data, user_id=user_id)
    db.add(db_lend)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_lend)
    
    return db_lend

def get_lends_by_user(
    db: Session, 
    user_id: int,
    status: str = None,
    from_date: str = None,
    to_date: str = None
) -> List[models.Lend]:
    # Start with base query
    query = db.query(models.Lend).filter(models.Lend.user_id == user_id)
    
    # Apply filters if provided
    if status and status != "all":
        query = query.filter(models.Lend.status == status)
    
    if from_date:
        query = query.filter(models.Lend.date >= from_date)
    
    if to_date:
        query = query.filter(models.Lend.date <= to_date)
    
    # Execute query and process results
    lends = query.all()

    # Calculate remaining amounts and update status
    for lend in lends:
        total_repaid = sum(Decimal(str(r.amount)) for r in lend.repayments)
        remaining = lend.amount - total_repaid

        if lend.remaining_amount != remaining:
            lend.remaining_amount = remaining
            if remaining <= 0 and lend.status != "settled":
                lend.status = "settled"
    
    db.commit()
    return lends



def get_lend_by_id(db: Session, lend_id: int) -> Optional[models.Lend]:
    lend = db.query(models.Lend).filter(models.Lend.id == lend_id).first()
    if lend:
        total_repaid = sum(Decimal(str(r.amount)) for r in lend.repayments)
        remaining = lend.amount - total_repaid

        if lend.remaining_amount != remaining:
            lend.remaining_amount = remaining
            if remaining <= 0 and lend.status != "settled":
                lend.status = "settled"
            db.commit()
    return lend



def delete_lend(db: Session, lend_id: int):
    lend = db.query(models.Lend).filter(models.Lend.id == lend_id).first()
    if lend:
        db.delete(lend)
        db.commit()
    else:
        raise HTTPException(status_code=404, detail="Lend record not found")


def update_lend(db: Session, lend_id: int, lend_update: schemas.LendUpdate) -> Optional[models.Lend]:
    lend = db.query(models.Lend).filter(models.Lend.id == lend_id).first()
    if not lend:
        return None

    for key, value in lend_update.dict(exclude_unset=True).items():
        setattr(lend, key, value)

    db.commit()
    db.refresh(lend)
    return lend



# -------- REPAYMENTS --------


def add_repayment(
    db: Session,
    repayment: schemas.RepaymentCreate,
    user_id: int,
    current_user: models.User
) -> models.Repayment:
    try:
        if repayment.borrow_id:
            transaction = db.query(models.Borrow).filter(
                models.Borrow.id == repayment.borrow_id,
                models.Borrow.user_id == user_id
            ).first()
            if not transaction:
                raise HTTPException(status_code=404, detail="Borrow record not found")
        elif repayment.lend_id:
            transaction = db.query(models.Lend).filter(
                models.Lend.id == repayment.lend_id,
                models.Lend.user_id == user_id
            ).first()
            if not transaction:
                raise HTTPException(status_code=404, detail="Lend record not found")
        else:
            raise HTTPException(status_code=400, detail="Either borrow_id or lend_id must be provided")

        if repayment.amount <= 0:
            raise HTTPException(status_code=400, detail="Repayment amount must be positive")

        if repayment.borrow_id:
            if repayment.amount > transaction.remaining_amount:
                raise HTTPException(status_code=400, detail="Repayment exceeds remaining borrow amount")

            if repayment.source == "savings":
                total_savings = sum(s.amount for s in current_user.savings if s.status == "saved")
                total_spent = sum(s.amount for s in current_user.savings if s.status == "spent")
                available_savings = total_savings - total_spent
                if repayment.amount > available_savings:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient savings balance. Available: ₹{available_savings}, Required: ₹{repayment.amount}"
                    )
                db.add(models.Saving(
                    user_id=user_id,
                    amount=repayment.amount,  # ✅ positive amount
                    type="spend",
                    reason=f"Repayment made to {transaction.person}",
                    date=repayment.date,
                    status="spent"
                ))

            elif repayment.source == "wallet":
                wallet = db.query(models.Wallet).filter(models.Wallet.user_id == user_id).first()
                if not wallet or wallet.balance < repayment.amount:
                    raise HTTPException(status_code=400, detail="Insufficient wallet balance")
                wallet.balance -= repayment.amount

            transaction.remaining_amount -= repayment.amount
            if transaction.remaining_amount <= 0:
                transaction.status = "settled"

        elif repayment.lend_id:
            if repayment.amount > transaction.remaining_amount:
                raise HTTPException(status_code=400, detail="Repayment exceeds remaining lend amount")

            if repayment.source == "savings":
                db.add(models.Saving(
                    user_id=user_id,
                    amount=repayment.amount,  # ✅ positive amount
                    type="income",
                    reason=f"Repayment received from {transaction.person}",
                    date=repayment.date,
                    status="saved"
                ))

            elif repayment.source == "wallet":
                wallet = db.query(models.Wallet).filter(models.Wallet.user_id == user_id).first()
                if not wallet:
                    raise HTTPException(status_code=404, detail="Wallet not found")
                wallet.balance += repayment.amount
                
                  # ✅ Add Income record (if desired)
                db.add(models.Income(
                    user_id=user_id,
                    amount=repayment.amount,
                    source="Lend Repayment",
                    date=repayment.date,
                    destination="wallet",
                    notes=f"Repayment from {transaction.person}"  # <-- this field must exist in DB
                 ))


            transaction.remaining_amount -= repayment.amount
            if transaction.remaining_amount <= 0:
                transaction.status = "settled"

        db_repayment = models.Repayment(**repayment.dict())
        db.add(db_repayment)
        db.commit()
        db.refresh(db_repayment)
        db.refresh(transaction)

        return db_repayment

    except Exception as e:
        db.rollback()
        print(f"Error in add_repayment: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while processing repayment")


def get_repayments_by_transaction(
    db: Session,
    transaction_id: int,
    user_id: int,
    transaction_type: Literal["borrow", "lend"]
) -> List[models.Repayment]:
    transaction = db.query(models.Borrow if transaction_type == "borrow" else models.Lend).filter(
        (models.Borrow.id if transaction_type == "borrow" else models.Lend.id) == transaction_id,
        (models.Borrow.user_id if transaction_type == "borrow" else models.Lend.user_id) == user_id
    ).first()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found or not authorized")
    return transaction.repayments


def get_repayment_summary(
    db: Session,
    transaction_id: int,
    user_id: int,
    transaction_type: Literal["borrow", "lend"]
) -> dict:
    transaction = db.query(models.Borrow if transaction_type == "borrow" else models.Lend).filter(
        (models.Borrow.id if transaction_type == "borrow" else models.Lend.id) == transaction_id,
        (models.Borrow.user_id if transaction_type == "borrow" else models.Lend.user_id) == user_id
    ).first()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    total_repaid = sum(r.amount for r in transaction.repayments)
    remaining = transaction.amount - total_repaid

    return {
        "total_amount": transaction.amount,
        "total_repaid": total_repaid,
        "remaining": remaining,
        "is_settled": remaining <= 0,
        "repayments": transaction.repayments,
        "transaction_details": {
            "person": transaction.person,
            "date": transaction.date,
            "description": transaction.description,
            "status": transaction.status,
            "remaining_amount": transaction.remaining_amount
        }
    }

# -------- SAVINGS --------
def create_saving(db: Session, saving_data) -> models.Saving:
    if not isinstance(saving_data, dict):
        saving_data = saving_data.dict()

    db_saving = models.Saving(**saving_data)
    db.add(db_saving)
    db.commit()
    db.refresh(db_saving)
    return db_saving


def get_savings_by_user(db: Session, user_id: int) -> List[models.Saving]:
    return db.query(models.Saving).filter(models.Saving.user_id == user_id).all()


def get_filtered_savings_query(db: Session, user_id: int):
    """Used for filtering in savings router with .filter().all()"""
    return db.query(models.Saving).filter(models.Saving.user_id == user_id)


def calculate_savings_balance(db: Session, user_id: int) -> float:
    savings = db.query(models.Saving).filter(models.Saving.user_id == user_id).all()
    balance = 0.0
    for s in savings:
        if s.type in ['auto', 'manual']:
            balance += s.amount
        elif s.type == 'spend':
            balance -= s.amount
    return balance


def get_saving(db: Session, saving_id: int) -> Optional[models.Saving]:
    return db.query(models.Saving).filter(models.Saving.id == saving_id).first()


def update_saving(db: Session, saving_id: int, saving_update: dict) -> Optional[models.Saving]:
    db_saving = get_saving(db, saving_id)
    if not db_saving:
        return None
    for key, value in saving_update.items():
        setattr(db_saving, key, value)
    db.commit()
    db.refresh(db_saving)
    return db_saving


def delete_saving(db: Session, saving_id: int) -> None:
    db_saving = get_saving(db, saving_id)
    if db_saving:
        db.delete(db_saving)
        db.commit()


def get_savings_balance(db: Session, user_id: int) -> float:
    total_savings = db.query(func.sum(models.Saving.amount)).filter(
        models.Saving.user_id == user_id,
        models.Saving.status == "saved"
    ).scalar()
    return total_savings or 0.0



# -------- REPORTS --------
def create_report(db: Session, user_id: int, report_data: List[dict], report_type: str, report_range: str = "N/A") -> models.Report:
    report_dir = "reports"
    os.makedirs(report_dir, exist_ok=True)

    file_path = os.path.join(report_dir, f"report_{uuid4().hex}.csv")

    try:
        if report_data:
            fieldnames = ["type", "amount", "source", "category", "date", "note"]
            with open(file_path, mode="w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(report_data)
        else:
            with open(file_path, mode="w", newline="", encoding="utf-8") as f:
                f.write("No data available.")
    except Exception as e:
        raise RuntimeError(f"Failed to write report: {e}")

    new_report = models.Report(
        user_id=user_id,
        type=report_type,
        range=report_range,
        file_path=file_path,
        created_at=datetime.utcnow().date()
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report

def get_reports_by_user(db: Session, user_id: int) -> List[models.Report]:
    return db.query(models.Report).filter(models.Report.user_id == user_id).all()

def generate_summary_report(db: Session, user_id: int) -> list[dict]:
    incomes = db.query(models.Income).filter(models.Income.user_id == user_id).all()
    expenses = db.query(models.Expense).filter(models.Expense.user_id == user_id).all()

    summary = []

    for income in incomes:
        summary.append({
            "type": "income",
            "amount": float(income.amount),
            "source": income.source,
            "category": "",  # empty for income
            "date": str(income.date),
            "note": income.notes or ""
        })

    for expense in expenses:
        summary.append({
            "type": "expense",
            "amount": float(expense.amount),
            "source": "",  # empty for expense
            "category": expense.category,
            "date": str(expense.date),
            "note": expense.description or ""
        })

    return summary




# -------- NOTIFICATIONS --------
def get_due_repayments_notifications(db: Session, user_id: int):
    borrow_pendings = get_pending_borrows(db, user_id)
    lend_pendings = get_pending_lends(db, user_id)
    notifications = []

    for bl in borrow_pendings:
        total_repaid = sum(r.amount for r in bl.repayments)
        due = bl.amount - total_repaid
        if due > 0:
            notifications.append({
                "type": "borrow_repayment_due",
                "person": bl.person,
                "due_amount": due,
                "date": bl.date.isoformat()
            })

    for ll in lend_pendings:
        total_repaid = sum(r.amount for r in ll.repayments)
        due = ll.amount - total_repaid
        if due > 0:
            notifications.append({
                "type": "lend_repayment_due",
                "person": ll.person,
                "due_amount": due,
                "date": ll.date.isoformat()
            })

    return notifications

def get_low_savings_notification(db: Session, user_id: int, threshold: float = 100.0):
    balance = calculate_savings_balance(db, user_id)
    if balance < threshold:
        return [{
            "type": "low_savings",
            "balance": balance,
            "message": f"Savings balance is low: {balance}"
        }]
    return []

def get_all_notifications(db: Session, user_id: int):
    notifications = []
    notifications.extend(get_due_repayments_notifications(db, user_id))
    notifications.extend(get_low_savings_notification(db, user_id))
    return notifications


# -------- DASHBOARD SUMMARY --------
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from backend import models


def get_wallet_balance(db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None) -> float:
    income_query = db.query(func.coalesce(func.sum(models.Income.amount), 0)) \
        .filter(models.Income.user_id == user_id, models.Income.destination == 'wallet')
    
    expense_query = db.query(func.coalesce(func.sum(models.Expense.amount), 0)) \
        .filter(models.Expense.user_id == user_id)
    
    borrow_query = db.query(func.coalesce(func.sum(models.Borrow.amount), 0)) \
        .filter(models.Borrow.user_id == user_id, models.Borrow.destination == 'wallet')
    
    # Apply date filters if provided
    if start_date:
        income_query = income_query.filter(models.Income.date >= start_date)
        expense_query = expense_query.filter(models.Expense.date >= start_date)
        borrow_query = borrow_query.filter(models.Borrow.date >= start_date)
    
    if end_date:
        income_query = income_query.filter(models.Income.date <= end_date)
        expense_query = expense_query.filter(models.Expense.date <= end_date)
        borrow_query = borrow_query.filter(models.Borrow.date <= end_date)
    
    income = income_query.scalar() or 0
    expense = expense_query.scalar() or 0
    borrow = borrow_query.scalar() or 0
    
    return float(Decimal(income) - Decimal(expense) + Decimal(borrow))


def get_savings_balance(db: Session, user_id: int) -> float:
    income = db.query(func.coalesce(func.sum(models.Income.amount), 0)) \
        .filter(models.Income.user_id == user_id, models.Income.destination == 'savings').scalar()
    expense = db.query(func.coalesce(func.sum(models.Expense.amount), 0)) \
        .filter(models.Expense.user_id == user_id).scalar()
    borrow = db.query(func.coalesce(func.sum(models.Borrow.amount), 0)) \
        .filter(models.Borrow.user_id == user_id, models.Borrow.destination == 'savings').scalar()
    lend = db.query(func.coalesce(func.sum(models.Lend.amount), 0)) \
        .filter(models.Lend.user_id == user_id, models.Lend.source == 'savings').scalar()

    return float(Decimal(income) - Decimal(expense) + Decimal(borrow) - Decimal(lend))


def get_borrow_summary(db: Session, user_id: int):
    borrow_wallet = db.query(func.coalesce(func.sum(models.Borrow.amount), 0)) \
        .filter(models.Borrow.user_id == user_id, models.Borrow.destination == 'wallet').scalar()
    borrow_savings = db.query(func.coalesce(func.sum(models.Borrow.amount), 0)) \
        .filter(models.Borrow.user_id == user_id, models.Borrow.destination == 'savings').scalar()
    return {
        "borrow_wallet": float(Decimal(borrow_wallet)),
        "borrow_savings": float(Decimal(borrow_savings))
    }


def get_lend_summary(db: Session, user_id: int):
    lend_wallet = db.query(func.coalesce(func.sum(models.Lend.amount), 0)) \
        .filter(models.Lend.user_id == user_id, models.Lend.source == 'wallet').scalar()
    lend_savings = db.query(func.coalesce(func.sum(models.Lend.amount), 0)) \
        .filter(models.Lend.user_id == user_id, models.Lend.source == 'savings').scalar()
    return {
        "lend_wallet": float(Decimal(lend_wallet)),
        "lend_savings": float(Decimal(lend_savings))
    }

def get_income_total(db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None) -> float:
    query = db.query(func.coalesce(func.sum(models.Income.amount), 0)).filter(models.Income.user_id == user_id)
    
    if start_date:
        query = query.filter(models.Income.date >= start_date)
    if end_date:
        query = query.filter(models.Income.date <= end_date)
    
    return float(query.scalar())

def get_expense_total(db: Session, user_id: int, start_date: Optional[date] = None, end_date: Optional[date] = None) -> float:
    query = db.query(func.coalesce(func.sum(models.Expense.amount), 0)).filter(models.Expense.user_id == user_id)
    
    if start_date:
        query = query.filter(models.Expense.date >= start_date)
    if end_date:
        query = query.filter(models.Expense.date <= end_date)
    
    return float(query.scalar())
