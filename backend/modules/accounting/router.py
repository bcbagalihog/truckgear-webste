from fastapi import APIRouter, HTTPException
from core.config import get_db_connection
from psycopg2.extras import RealDictCursor

router = APIRouter(prefix="/api/accounting", tags=["accounting"])

@router.get("/summary")
async def get_accounting_summary():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Ensure payments table exists
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
        
        # Aggregate local revenue from partsman_db
        cur.execute("SELECT COALESCE(SUM(amount), 0) as total FROM public.payments WHERE payment_date >= CURRENT_DATE")
        daily = cur.fetchone()['total']
        
        cur.execute("SELECT COALESCE(SUM(amount), 0) as total FROM public.payments WHERE payment_date >= CURRENT_DATE - INTERVAL '7 days'")
        weekly = cur.fetchone()['total']
        
        cur.execute("SELECT COALESCE(SUM(amount), 0) as total FROM public.payments WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days'")
        monthly = cur.fetchone()['total']
        
        # Recent payment logs
        cur.execute("""
            SELECT id, invoice_number as quote_id, amount as total_amount, payment_method, payment_date as created_at 
            FROM public.payments 
            ORDER BY payment_date DESC LIMIT 10
        """)
        recent = cur.fetchall()
        
        cur.close()
        conn.close()
        return {
            "daily": float(daily),
            "weekly": float(weekly),
            "monthly": float(monthly),
            "recent": recent
        }
    except Exception as e:
        print(f"[MODULAR_MONOLITH] Summary Fetch Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
