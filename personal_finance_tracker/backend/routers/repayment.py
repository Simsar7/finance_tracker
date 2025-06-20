                
                
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func
from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP
import logging
from typing import Optional,List
from backend import schemas, models
from backend.database import get_db
from backend.utils import get_current_user, get_repayment_status

router = APIRouter(tags=["Repayment"])
logger = logging.getLogger(__name__)

def decimal_quantize(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def get_wallet_balance(db: Session, user_id: int) -> float:
    income = db.query(func.coalesce(func.sum(models.Income.amount), 0)) \
        .filter(models.Income.user_id == user_id, models.Income.destination == 'wallet').scalar()

    expense = db.query(func.coalesce(func.sum(models.Expense.amount), 0)) \
        .filter(models.Expense.user_id == user_id).scalar()

    borrow = db.query(func.coalesce(func.sum(models.Borrow.amount), 0)) \
        .filter(models.Borrow.user_id == user_id, models.Borrow.destination == 'wallet').scalar()

    return float(Decimal(income) - Decimal(expense) + Decimal(borrow))

def get_savings_balance(db: Session, user_id: int) -> Decimal:
    saved = db.query(func.coalesce(func.sum(models.Saving.amount), 0)).filter(
        models.Saving.user_id == user_id, models.Saving.status == 'saved').scalar()
    
    spent = db.query(func.coalesce(func.sum(models.Saving.amount), 0)).filter(
        models.Saving.user_id == user_id, models.Saving.status == 'spent').scalar()

    return decimal_quantize(Decimal(saved) - Decimal(spent))

def get_borrow_summary(db: Session, user_id: int):
    borrow_wallet = db.query(func.coalesce(func.sum(models.Borrow.amount), 0)).filter(
        models.Borrow.user_id == user_id, models.Borrow.destination == 'wallet').scalar()
    borrow_savings = db.query(func.coalesce(func.sum(models.Borrow.amount), 0)).filter(
        models.Borrow.user_id == user_id, models.Borrow.destination == 'savings').scalar()
    return {
        "borrow_wallet": decimal_quantize(Decimal(borrow_wallet)),
        "borrow_savings": decimal_quantize(Decimal(borrow_savings))
    }

def get_lend_summary(db: Session, user_id: int):
    lend_wallet = db.query(func.coalesce(func.sum(models.Lend.amount), 0)).filter(
        models.Lend.user_id == user_id, models.Lend.source == 'wallet').scalar()
    lend_savings = db.query(func.coalesce(func.sum(models.Lend.amount), 0)).filter(
        models.Lend.user_id == user_id, models.Lend.source == 'savings').scalar()
    return {
        "lend_wallet": decimal_quantize(Decimal(lend_wallet)),
        "lend_savings": decimal_quantize(Decimal(lend_savings))
    }

def get_dashboard_summary(db: Session, current_user: models.User) -> schemas.DashboardSummary:
    wallet_balance = get_wallet_balance(db, current_user.id)
    savings_balance = get_savings_balance(db, current_user.id)
    borrow_summary = get_borrow_summary(db, current_user.id)
    lend_summary = get_lend_summary(db, current_user.id)

    return schemas.DashboardSummary(
        wallet_balance=wallet_balance,
        savings_balance=savings_balance,
        borrow_wallet=borrow_summary["borrow_wallet"],
        borrow_savings=borrow_summary["borrow_savings"],
        lend_wallet=lend_summary["lend_wallet"],
        lend_savings=lend_summary["lend_savings"]
    )

@router.post("/borrows/{borrow_id}", response_model=schemas.Repayment)
def create_borrow_repayment(
    borrow_id: int,
    repayment: schemas.RepaymentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        dashboard_summary = get_dashboard_summary(db, current_user)
        
        borrow = db.query(models.Borrow).filter(
            models.Borrow.id == borrow_id,
            models.Borrow.user_id == current_user.id
        ).with_for_update().first()

        if not borrow:
            raise HTTPException(status_code=404, detail="Borrow record not found")

        repayment_amt = decimal_quantize(Decimal(str(repayment.amount)))
        if repayment_amt <= Decimal("0.00"):
            raise HTTPException(status_code=400, detail="Amount must be greater than 0")

        if repayment_amt > borrow.remaining_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Repayment ₹{repayment_amt} exceeds remaining ₹{borrow.remaining_amount}"
            )

        if repayment.source == "wallet":
            if dashboard_summary.wallet_balance < repayment_amt:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient wallet balance ₹{dashboard_summary.wallet_balance}"
                )
            db.add(models.Expense(
                user_id=current_user.id,
                amount=repayment_amt,
                date=repayment.date or date.today(),
                category="repayment",
                description=f"Repayment to {borrow.person}",
               # payment_method="wallet"
            ))

        elif repayment.source == "savings":
            if dashboard_summary.savings_balance < repayment_amt:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Insufficient savings balance ₹{dashboard_summary.savings_balance}"
                )
            db.add(models.Saving(
                user_id=current_user.id,
                amount=repayment_amt,
                type="spend",
                status="spent",
                date=repayment.date or date.today(),
                reason=f"Repayment to {borrow.person}",
                created_at=datetime.now()
            ))
        else:
            raise HTTPException(status_code=400, detail="Invalid source. Must be 'wallet' or 'savings'")

        borrow.remaining_amount = decimal_quantize(Decimal(str(borrow.remaining_amount)) - repayment_amt)
        if borrow.remaining_amount <= Decimal("0.00"):
            borrow.status = "settled"
            borrow.remaining_amount = Decimal("0.00")

        db_repayment = models.Repayment(
            amount=repayment_amt,
            date=repayment.date or date.today(),
            source=repayment.source,
            notes=repayment.notes or f"Repayment to {borrow.person}",
            borrow_id=borrow_id
        )
        db.add(db_repayment)

        db.commit()
        return db_repayment

    except HTTPException as e:
        db.rollback()
        logger.error(f"Borrow repayment rejected: {e.detail}")
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Borrow repayment failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
@router.post("/lends/{lend_id}", response_model=schemas.Repayment)
def receive_lend_repayment(
    lend_id: int,
    repayment: schemas.RepaymentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        dashboard_summary = get_dashboard_summary(db, current_user)

        lend = db.query(models.Lend).filter(
            models.Lend.id == lend_id,
            models.Lend.user_id == current_user.id
        ).with_for_update().first()

        if not lend:
            raise HTTPException(status_code=404, detail="Lend record not found")

        repayment_amt = decimal_quantize(Decimal(str(repayment.amount)))
        if repayment_amt <= Decimal("0.00"):
            raise HTTPException(status_code=400, detail="Repayment amount must be positive")

        total_repaid = sum(decimal_quantize(r.amount) for r in lend.repayments)
        remaining = decimal_quantize(lend.amount - total_repaid)

        if repayment_amt > remaining:
            raise HTTPException(
                status_code=400,
                detail=f"Repayment amount {repayment_amt} exceeds remaining {remaining}"
            )

        # Process based on selected destination (source field in schema)
        if repayment.source == "wallet":
            db.add(models.Income(
                user_id=current_user.id,
                amount=repayment_amt,
                source="repayment",
                date=repayment.date or date.today(),
                destination="wallet",
                notes=f"Repayment from {lend.person}"
            ))

        elif repayment.source == "savings":
            db.add(models.Saving(
                user_id=current_user.id,
                amount=repayment_amt,
                type="auto",
                status="saved",  # ✅ change from "active" to "saved" if that's the correct terminology in your app
                date=repayment.date or date.today(),
                reason=f"Repayment from {lend.person}",
                created_at=datetime.now()
            ))
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid source. Use 'wallet' or 'savings'"
            )

        db_repayment = models.Repayment(
            amount=repayment_amt,
            date=repayment.date or date.today(),
            source=repayment.source,
            notes=repayment.notes or f"Repayment from {lend.person}",
            lend_id=lend_id,
        )
        db.add(db_repayment)

        lend.remaining_amount = decimal_quantize(remaining - repayment_amt)
        if lend.remaining_amount <= Decimal("0.00"):
            lend.status = "settled"
            lend.remaining_amount = Decimal("0.00")

        db.commit()
        return db_repayment

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Lend repayment failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")



        
@router.get("/borrows/{borrow_id}/repayments", response_model=list[schemas.Repayment])
def get_borrow_repayments(
    borrow_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    borrow = db.query(models.Borrow).filter(
        models.Borrow.id == borrow_id,
        models.Borrow.user_id == current_user.id
    ).first()
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow record not found")
    return borrow.repayments

@router.get("/lends/{lend_id}/repayments", response_model=list[schemas.Repayment])
def get_lend_repayments(
    lend_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    lend = db.query(models.Lend).filter(
        models.Lend.id == lend_id,
        models.Lend.user_id == current_user.id
    ).first()
    if not lend:
        raise HTTPException(status_code=404, detail="Lend record not found")
    return lend.repayments

from sqlalchemy import or_
from sqlalchemy.orm import joinedload

from sqlalchemy.orm import joinedload
from sqlalchemy import or_, and_
from fastapi import Query

@router.get("/", response_model=List[dict])
def get_all_repayments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    type: str = Query("all", enum=["all", "borrow", "lend"]),
    status: str = Query("all", enum=["all", "pending", "settled"]),
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
):
    query = db.query(models.Repayment).options(
        joinedload(models.Repayment.borrow),
        joinedload(models.Repayment.lend)
    )

    query = query.filter(
        or_(
            models.Repayment.borrow.has(models.Borrow.user_id == current_user.id),
            models.Repayment.lend.has(models.Lend.user_id == current_user.id)
        )
    )

    if type == "borrow":
        query = query.filter(models.Repayment.borrow_id.isnot(None))
    elif type == "lend":
        query = query.filter(models.Repayment.lend_id.isnot(None))

    if from_date:
        query = query.filter(models.Repayment.date >= from_date)
    if to_date:
        query = query.filter(models.Repayment.date <= to_date)

    query = query.outerjoin(models.Repayment.borrow).outerjoin(models.Repayment.lend)

    if status != "all":
        query = query.filter(
            or_(
                and_(models.Repayment.borrow_id.isnot(None), models.Borrow.status == status),
                and_(models.Repayment.lend_id.isnot(None), models.Lend.status == status)
            )
        )

    repayments = query.order_by(models.Repayment.date.desc()).all()

    result = []
    for r in repayments:
        item = {
            "id": r.id,
            "amount": r.amount,
            "date": r.date,
            "notes": r.notes,
            "created_at": r.created_at,
        }

        if r.borrow_id and r.borrow:
            item["type"] = "borrow"
            item["person"] = r.borrow.person
            item["source"] = r.borrow.destination  # ✅ fixed
            item["status"] = r.borrow.status
        elif r.lend_id and r.lend:
            item["type"] = "lend"
            item["person"] = r.lend.person
            item["destination"] = r.lend.source  # ✅ fixed
            item["status"] = r.lend.status

        result.append(item)

    return result
