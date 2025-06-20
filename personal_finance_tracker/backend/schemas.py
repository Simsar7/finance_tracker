from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional, List, Literal, Dict
from datetime import date, datetime
from decimal import Decimal
 # ✅

# ---------------- USER ---------------- #

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    email: EmailStr

class User(BaseModel):
    id: int
    username: str
    email: Optional[str]

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str

# ---------------- INCOME ---------------- #

class IncomeBase(BaseModel):
    amount: Decimal
    source: str
    date: date
    destination: Literal["wallet", "savings"]
    notes: Optional[str] = None

class IncomeCreate(IncomeBase):
    pass

class Income(IncomeBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# ---------------- EXPENSE ---------------- #

class ExpenseBase(BaseModel):
    amount: Decimal
    category: str
    date: date
    description: Optional[str] = None
    
class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    amount: Optional[Decimal]
    category: Optional[str]
    date: Optional[date]
    notes: Optional[str]

    class Config:
        from_attributes = True

class Expense(ExpenseBase):
    id: int

    class Config:
        from_attributes = True

# ---------------- BORROW ---------------- #

class BorrowBase(BaseModel):
    person: str
    amount: Decimal
    description: Optional[str] = None
    type: Literal["borrow"] = "borrow"
    status: Optional[Literal["pending", "settled"]] = "pending"
    destination: Literal["wallet", "savings"]
    date: date

class BorrowCreate(BorrowBase):
    pass

class Borrow(BorrowBase):
    id: int
    user_id: int
    remaining_amount: Optional[Decimal] = None
    created_at: datetime

    class Config:
        orm_mode = True


class BorrowUpdate(BaseModel):
    person: Optional[str] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    status: Optional[Literal["pending", "settled"]] = None
    destination: Optional[Literal["wallet", "savings"]] = None
    date: date  # make optional for partial updates

    class Config:
        orm_mode = True


# ----------- LEND ------------

class LendBase(BaseModel):
    person: str
    amount: Decimal
    remaining_amount: Decimal
    description: Optional[str] = None
    type: Literal["lend"] = "lend"
    status: Optional[Literal["pending", "settled"]] = "pending"
    date: date
    source: Literal["wallet", "savings"]
    #destination: Optional[Literal["wallet", "savings"]] = None  # ADD THIS

class LendCreate(LendBase):
    pass

class Lend(LendBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True

class LendUpdate(BaseModel):
    person: Optional[str] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    status: Optional[Literal["pending", "settled"]] = None
    source: Optional[Literal["wallet", "savings"]] = None
    date: date

    class Config:
        orm_mode = True
        

# ---------------- REPAYMENT ---------------- #

class RepaymentBase(BaseModel):
    amount: Decimal
    date: date
    source: Optional[Literal["wallet", "savings"]] = None
    destination: Optional[Literal["wallet", "savings"]] = None

    notes: Optional[str] = None
    borrow_id: Optional[int] = None
    lend_id: Optional[int] = None

@model_validator(mode='after')
def check_one_transaction(self):
    if not (self.borrow_id or self.lend_id):
        raise ValueError('Either borrow_id or lend_id must be provided')
    if self.borrow_id and self.lend_id:
        raise ValueError('Only one of borrow_id or lend_id should be provided')
    if self.lend_id and not self.destination:
        raise ValueError('Destination is required for lend repayments')
    if self.borrow_id and not self.source:
        raise ValueError('Source is required for borrow repayments')
    return self



class RepaymentCreate(RepaymentBase):
    pass

class Repayment(RepaymentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ---------------- SAVING ---------------- #

class SavingBase(BaseModel):
    user_id: int
    amount: Decimal
    type: Literal['auto', 'manual', 'spend']
    reason: str
    date: date
    status: Optional[str] = "saved"

class SavingCreate(SavingBase):
    pass

class Saving(SavingBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SavingUpdate(BaseModel):
    amount: Optional[Decimal]
    type: Optional[Literal['auto', 'manual', 'spend']]
    reason: Optional[str]
    date: Optional[date]
    status: Optional[str]

    class Config:
        from_attributes = True

# ---------------- REPORT ---------------- #

class ReportBase(BaseModel):
    user_id: int
    type: str
    range: Optional[str]
    file_path: Optional[str]
    created_at: Optional[datetime]

class ReportCreate(BaseModel):
    user_id: int
    report_data: str
    report_type: str

class Report(ReportBase):
    id: int

    class Config:
        from_attributes = True

# ---------------- DASHBOARD ---------------- #

# class BorrowLendSummary(BaseModel):
#     total_borrowed: Decimal
#     total_lent: Decimal

class DashboardSummary(BaseModel):
    wallet_balance: Decimal
    savings_balance: Decimal
    borrow_wallet: Decimal
    borrow_savings: Decimal
    lend_wallet: Decimal
    lend_savings: Decimal

class Dashboard(BaseModel):
    wallet_balance: Decimal
    savings_balance: Decimal
    borrow_summary: Dict[str, Decimal]
    lend_summary: Dict[str, Decimal]
    
    class Config:
        from_attributes = True

# ---------------- NOTIFICATION ---------------- #

class Notification(BaseModel):
    type: str
    person: Optional[str] = None
    due_amount: Optional[Decimal] = None
    date: Optional[str] = None
    balance: Optional[Decimal] = None
    message: Optional[str] = None

    class Config:
        from_attributes = True

