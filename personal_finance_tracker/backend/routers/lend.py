from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend import schemas, models, crud
from backend.database import get_db
from backend.utils import get_current_user

router = APIRouter(tags=["Lends"])


@router.post("/", response_model=schemas.Lend, status_code=status.HTTP_201_CREATED)
def create_lend(
    lend: schemas.LendCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if lend.source not in ("wallet", "savings"):
        raise HTTPException(status_code=400, detail="Invalid source")
    if lend.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    try:
        return crud.create_lend(db, lend, current_user.id)
    except Exception as e:
        print("CREATE LEND ERROR:", str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[schemas.Lend])
def get_user_lends(
    status: str = None,
    from_date: str = None,
    to_date: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_lends_by_user(
        db, 
        current_user.id, 
        status=status,
        from_date=from_date,
        to_date=to_date
    )

@router.get("/pending", response_model=List[schemas.Lend])
def get_pending_lends(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_lends_by_status(db, current_user.id, "pending")


@router.get("/settled", response_model=List[schemas.Lend])
def get_settled_lends(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_lends_by_status(db, current_user.id, "settled")


@router.get("/{lend_id}", response_model=schemas.Lend)
def get_lend_by_id(
    lend_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    lend = crud.get_lend_by_id(db, lend_id)
    if not lend or lend.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lend not found")
    return lend


@router.get("/{lend_id}/summary", response_model=dict)
def get_lend_summary(
    lend_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    lend = crud.get_lend_by_id(db, lend_id)
    if not lend or lend.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lend not found")

    total_repaid = sum(r.amount for r in lend.repayments)
    remaining = lend.amount - total_repaid

    # Auto update if settled
    if remaining <= 0 and lend.status != "settled":
        lend.status = "settled"
        db.commit()

    return {
        "lend": lend,
        "total_repaid": total_repaid,
        "remaining": remaining,
        "repayments": lend.repayments,
        "is_settled": remaining <= 0
    }


@router.put("/{lend_id}", response_model=schemas.Lend)
def update_lend(
    lend_id: int,
    lend_update: schemas.LendUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    lend = crud.get_lend_by_id(db, lend_id)
    if not lend or lend.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lend not found")

    if lend_update.source and lend_update.source not in ("wallet", "savings"):
        raise HTTPException(status_code=400, detail="Invalid source")

    return crud.update_lend(db, lend_id, lend_update)


@router.delete("/{lend_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lend(
    lend_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    lend = crud.get_lend_by_id(db, lend_id)
    if not lend or lend.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Lend not found")

    crud.delete_lend(db, lend_id)
    return
