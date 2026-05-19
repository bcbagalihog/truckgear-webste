from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.config import get_db_connection
from psycopg2.extras import RealDictCursor

router = APIRouter(prefix="/api/payments", tags=["payments"])

class PaymentInput(BaseModel):
    invoice_number: str
    amount: float
    payment_method: str
    reference_number: str

@router.post("/create")
async def create_payment(payment: PaymentInput):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Ensure separated payments table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS public.payments (
                id SERIAL PRIMARY KEY,
                invoice_number TEXT,
                amount NUMERIC(15, 2) NOT NULL,
                payment_method TEXT NOT NULL,
                reference_number TEXT NOT NULL,
                status TEXT DEFAULT 'Completed',
                payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cur.execute("""
            INSERT INTO public.payments (invoice_number, amount, payment_method, reference_number, status)
            VALUES (%s, %s, %s, %s, 'Completed')
            RETURNING id
        """, (payment.invoice_number, payment.amount, payment.payment_method, payment.reference_number))
        
        pay_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "Success", "payment_id": pay_id}
    except Exception as e:
        print(f"[MODULAR_MONOLITH] Payment Save Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list")
async def list_payments():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS public.payments (
                id SERIAL PRIMARY KEY,
                invoice_number TEXT,
                amount NUMERIC(15, 2) NOT NULL,
                payment_method TEXT NOT NULL,
                reference_number TEXT NOT NULL,
                status TEXT DEFAULT 'Completed',
                payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cur.execute("""
            SELECT id, invoice_number, amount, payment_method, reference_number, status, payment_date 
            FROM public.payments 
            ORDER BY payment_date DESC LIMIT 50
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return rows
    except Exception as e:
        print(f"[MODULAR_MONOLITH] Payment List Failed: {e}")
        return []
