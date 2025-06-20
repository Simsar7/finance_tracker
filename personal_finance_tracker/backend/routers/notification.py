from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.utils import get_current_user
from backend.models import User

from backend import crud, schemas, database

router = APIRouter(prefix="/notifications", tags=["notifications"])
get_db = database.get_db

@router.get("/", response_model=List[schemas.Notification])
def read_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return crud.get_all_notifications(db, current_user.id)
@router.post("/", response_model=schemas.Notification)
def create_notification(user_id: int, message: str, db: Session = Depends(get_db)):
    return crud.create_notification(user_id, message, db)

@router.put("/{notification_id}/read", response_model=schemas.Notification)
def read_notification(notification_id: int, db: Session = Depends(get_db)):
    notif = crud.mark_notification_read(notification_id, db)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notif
