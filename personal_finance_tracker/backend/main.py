from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
from typing import List, Optional
from datetime import date
from backend.routers import users, expense, income, report, savings, dashboard, borrow, lend, repayment, notification
from backend import models, schemas, crud
from backend.database import SessionLocal, engine
from backend.utils import get_current_user
from fastapi.security import OAuth2PasswordBearer, SecurityScopes
from fastapi.openapi.models import OAuthFlows as OAuthFlowsModel
from fastapi.security import OAuth2
from fastapi.openapi.utils import get_openapi

# Initialize app first
app = FastAPI(title="Personal Finance Tracker API")

# ✅ Move this BEFORE app.include_router
origins = [
    "https://finance-tracker-rouge-ten.vercel.app",
    "https://finance-tracker-c39ob5isq-simsars-projects.vercel.app",
    "https://finance-tracker-c1gp04xmo-simsars-projects.vercel.app",  # ✅ Add this one too!
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.on_event("startup")
def startup_event():
    models.Base.metadata.create_all(bind=engine)

# ✅ Now include routers
app.include_router(users.router, prefix="/auth", tags=["auth"])
app.include_router(borrow.router, prefix="/borrows")
app.include_router(lend.router, prefix="/lends")
app.include_router(repayment.router, prefix="/repayments", tags=["repayments"])
app.include_router(expense.router, prefix="/expenses", tags=["expenses"])
app.include_router(income.router, prefix="/incomes", tags=["incomes"])
app.include_router(report.router, prefix="/reports", tags=["reports"])
app.include_router(savings.router, prefix="/savings", tags=["savings"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(notification.router, prefix="/notifications", tags=["notifications"])

# Custom OpenAPI config
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="Personal Finance Tracker API",
        version="1.0.0",
        description="API description here",
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "OAuth2PasswordBearer": {
            "type": "oauth2",
            "flows": {
                "password": {
                    "tokenUrl": "/auth/login",
                    "scopes": {}
                }
            }
        }
    }
    openapi_schema["security"] = [{"OAuth2PasswordBearer": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
