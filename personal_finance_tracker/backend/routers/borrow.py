from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend import schemas, models, crud
from backend.database import get_db
from backend.utils import get_current_user

router = APIRouter(tags=["Borrows"])


@router.post("/", response_model=schemas.Borrow, status_code=status.HTTP_201_CREATED)
def create_borrow(
    borrow: schemas.BorrowCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if borrow.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    # Add amount to user's wallet
    wallet = db.query(models.Wallet).filter(models.Wallet.user_id == current_user.id).first()
    if not wallet:
        wallet = models.Wallet(user_id=current_user.id, balance=0)
        db.add(wallet)
        db.flush()  # create it so we can update it

    wallet.balance += borrow.amount
    db.add(wallet)

    db_borrow = models.Borrow(
        user_id=current_user.id,
        person=borrow.person,
        amount=borrow.amount,
        remaining_amount=borrow.amount,
        date=borrow.date,
        destination="wallet",  # force-set to wallet for backward compatibility
        description=borrow.description,
        status="pending",
    )

    try:
        db.add(db_borrow)
        db.commit()
        db.refresh(db_borrow)
        return db_borrow
    except Exception as e:
        db.rollback()
        print("CREATE BORROW ERROR:", str(e))
        raise HTTPException(status_code=400, detail=str(e))
    

@router.get("/", response_model=List[schemas.Borrow])
def get_user_borrows(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    borrows = crud.get_borrows_by_user(db, user_id=current_user.id)
    return borrows


@router.get("/pending/", response_model=List[schemas.Borrow])
def get_pending_borrows(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.get_borrows_by_status(db, user_id=current_user.id, status="pending")


@router.get("/{borrow_id}", response_model=schemas.Borrow)
def get_borrow(
    borrow_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    borrow = crud.get_borrow_by_id(db, borrow_id=borrow_id, user_id=current_user.id)
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow not found")
    return borrow


@router.put("/{borrow_id}", response_model=schemas.Borrow)
def update_borrow(
    borrow_id: int,
    borrow_data: schemas.BorrowUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if borrow_data.destination and borrow_data.destination not in ("wallet", "savings"):
        raise HTTPException(status_code=400, detail="Invalid destination")

    return crud.update_borrow(db, borrow_id=borrow_id, borrow_data=borrow_data, user_id=current_user.id)


@router.delete("/{borrow_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_borrow(
    borrow_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    crud.delete_borrow(db, borrow_id=borrow_id, user_id=current_user.id)
    return
