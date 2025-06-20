from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend import schemas, crud, models
from backend.database import get_db
from backend.utils import get_current_user

router = APIRouter(tags=["Savings"])


@router.post("/", response_model=schemas.Saving)
def create_saving(
    saving: schemas.SavingCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    saving_data = saving.dict()
    saving_data['user_id'] = current_user.id
    db_saving = crud.create_saving(db, saving_data)
    return schemas.Saving.model_validate(db_saving)


@router.get("/", response_model=List[schemas.Saving])
def get_my_savings(
    type: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    savings_query = crud.get_filtered_savings_query(db, current_user.id)

    if type:
        types = [t.strip() for t in type.split(",")]
        savings_query = savings_query.filter(models.Saving.type.in_(types))

    if from_date:
        savings_query = savings_query.filter(models.Saving.date >= from_date)

    if to_date:
        savings_query = savings_query.filter(models.Saving.date <= to_date)

    savings = savings_query.all()
    return [schemas.Saving.model_validate(s) for s in savings]


@router.get("/user/{user_id}", response_model=List[schemas.Saving])
def get_savings(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You can only view your own savings"
        )
    savings = crud.get_savings_by_user(db, user_id)
    return [schemas.Saving.model_validate(s) for s in savings]


@router.get("/balance")
def get_savings_balance(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    balance = crud.get_savings_balance(db, current_user.id)
    return {"balance": balance, "user_id": current_user.id}


@router.put("/{saving_id}", response_model=schemas.Saving)
def update_saving(
    saving_id: int,
    saving_update: schemas.SavingUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    db_saving = crud.get_saving(db, saving_id)
    if not db_saving or db_saving.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Saving not found or access denied")

    update_data = saving_update.dict(exclude_unset=True)
    updated_saving = crud.update_saving(db, saving_id, update_data)
    return schemas.Saving.model_validate(updated_saving)


@router.delete("/{saving_id}")
def delete_saving(
    saving_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user),
):
    db_saving = crud.get_saving(db, saving_id)
    if not db_saving or db_saving.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Saving not found or access denied")

    crud.delete_saving(db, saving_id)
    return {"detail": "Saving deleted successfully"}
