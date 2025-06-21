import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables from .env (for local development only)
load_dotenv()

# Get the DATABASE_URL from environment (fail fast if missing in production)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set. Make sure it's configured in Railway Variables.")

# SQLAlchemy setup
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency for DB session
def get_db():
    try:
        db = SessionLocal()
        print("✅ Database session created")
        yield db
    except Exception as e:
        print("❌ Error creating DB session:", str(e))
        raise
    finally:
        db.close()
