import sys
from pathlib import Path

# Add project root to sys.path so modules can be imported directly
sys.path.append(str(Path(__file__).resolve().parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import init_database

# Import routers from their respective modular monolithic boundaries
from modules.inventory.router import router as inventory_router
from modules.payments.router import router as payments_router
from modules.accounting.router import router as accounting_router

# Initialize the isolated database 'partsman_db' dynamically
init_database()

app = FastAPI(
    title="PARTSMAN AI OS Kernel",
    description="Heavy-duty logistics management client cockpit designed in a Modular Monolithic Architecture.",
    version="2.1"
)

# Enable CORS for the client frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular monolithic routers
app.include_router(inventory_router)
app.include_router(payments_router)
app.include_router(accounting_router)

@app.get("/")
async def root():
    return {
        "kernel": "PARTSMAN_AI_OS_KERNEL_ONLINE",
        "architecture": "Modular Monolithic Architecture",
        "database": "partsman_db (Isolated)",
        "modules": ["inventory", "payments", "accounting"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8055, reload=True)
