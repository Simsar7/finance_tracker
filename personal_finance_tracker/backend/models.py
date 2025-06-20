from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.sql import func

from sqlalchemy.orm import relationship
from backend.database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True,nullable=False)
    email = Column(String, unique=True, index=True,nullable=False)
    password = Column(String(100),nullable=False)  # Store hashed passwords

    incomes = relationship("Income", back_populates="user")
    expenses = relationship("Expense", back_populates="user")
    borrows = relationship("Borrow", back_populates="user")
    lends = relationship("Lend", back_populates="user")
    savings = relationship("Saving", back_populates="user")
    reports = relationship("Report", back_populates="user")
    wallet = relationship("Wallet", back_populates="user", uselist=False)

class Income(Base):
    __tablename__ = "income"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Numeric(10, 2), nullable=False)
    source = Column(String(100), nullable=False)
    date = Column(Date, nullable=False)
    destination = Column(String(50), nullable=False)  # ✅ NEW FIELD
    notes = Column(String(255), nullable=True)
    
    user = relationship("User", back_populates="incomes")
    
class Expense(Base):
    __tablename__ = "expenses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Numeric(10, 2))  # Use Numeric for precise amounts
    category = Column(String(100))
    date = Column(Date)
    description = Column(Text)  # Keep description or rename notes if you want

    user = relationship("User", back_populates="expenses")

from sqlalchemy import Column, Integer, Float, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class Borrow(Base):
    __tablename__ = "borrows"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    person = Column(String, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    remaining_amount = Column(Numeric(10, 2), nullable=False)  # Add this
    description = Column(Text)
    type = Column(String, default="borrow", nullable=False)
    status = Column(String, default="pending", nullable=False)
    date = Column(Date, default=lambda: datetime.utcnow().date(), nullable=False)
    destination = Column(String(50), nullable=True)  # "wallet" or "savings"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="borrows")
    repayments = relationship(
        "Repayment",
        back_populates="borrow",
        cascade="all, delete-orphan"
    )

class Lend(Base):
    __tablename__ = "lends"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    person = Column(String, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    description = Column(Text)
    type = Column(String, default="lend", nullable=False)
    status = Column(String, default="pending", nullable=False)
    source = Column(String(50), nullable=True)  # "wallet" or "savings"
    #destination = Column(String(50), nullable=True)  # optional, depending on your logic
    date = Column(Date, default=lambda: datetime.utcnow().date(), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    remaining_amount = Column(Numeric(10, 2), nullable=False)  # Add this

    user = relationship("User", back_populates="lends")
    repayments = relationship(
        "Repayment",
        back_populates="lend",
        cascade="all, delete-orphan"
    )


class Repayment(Base):
    __tablename__ = "repayments"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    date = Column(Date, nullable=False)
    source = Column(String, default="wallet", nullable=False)  # "wallet" or "savings"
    borrow_id = Column(Integer, ForeignKey("borrows.id"), nullable=True)
    lend_id = Column(Integer, ForeignKey("lends.id"), nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    borrow = relationship("Borrow", back_populates="repayments")
    lend = relationship("Lend", back_populates="repayments")

class Saving(Base):
    __tablename__ = 'savings'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    amount = Column(Numeric(10, 2), default=0.0)
    type = Column(String)
    reason = Column(String)
    date = Column(Date)
    status = Column(String)  
    created_at = Column(DateTime)

    user = relationship("User", back_populates="savings")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # ✅ ForeignKey added
    type = Column(String, nullable=False)
    range = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    created_at = Column(Date, default=datetime.utcnow)

    user = relationship("User", back_populates="reports")
    
class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    balance = Column(Numeric(10, 2), default=0.0)

    user = relationship("User", back_populates="wallet")


