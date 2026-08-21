from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from database import engine, SessionLocal
from services.mock_data import init_db, seed_db
from api import routes
import uvicorn

app = FastAPI(title="Citizen Call Intelligence Platform")

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB and seed
init_db()
db = SessionLocal()
seed_db(db)
db.close()

# Include API router
app.include_router(routes.router, prefix="/api")

# Serve static files for frontend
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
