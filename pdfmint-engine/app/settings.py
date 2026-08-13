
from __future__ import annotations
import os

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(100 * 1024 * 1024)))
JOB_TIMEOUT_SECONDS = int(os.getenv("JOB_TIMEOUT_SECONDS", "180"))

ALLOWED_ORIGINS = sorted({
    "https://pdfbreeze.net",
    "https://www.pdfbreeze.net",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:3000",
    *{
        value.strip().rstrip("/")
        for value in os.getenv("ALLOWED_ORIGINS", "").split(",")
        if value.strip()
    },
})

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://xbljndoecxppmchujysw.supabase.co").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

STRIPE_PRICES = {
    "document_trial": {
        "initial": os.getenv("STRIPE_PRICE_DOCUMENT_TRIAL_GBP", "price_1U3fRnJAG10RJqJq6EEF89De"),
        "recurring": os.getenv("STRIPE_PRICE_MEMBERSHIP_4WEEK_GBP", "price_1U3fLOJAG10RJqJq0wxaDdFQ"),
        "trial_days": 7,
    },
    "unlimited_trial": {
        "initial": os.getenv("STRIPE_PRICE_UNLIMITED_TRIAL_GBP", "price_1U3fOfJAG10RJqJq3QzBl76x"),
        "recurring": os.getenv("STRIPE_PRICE_MEMBERSHIP_4WEEK_GBP", "price_1U3fLOJAG10RJqJq0wxaDdFQ"),
        "trial_days": 7,
    },
    "annual": {
        "initial": None,
        "recurring": os.getenv("STRIPE_PRICE_ANNUAL_GBP", "price_1U3fPdJAG10RJqJq8i6gW9cb"),
        "trial_days": 0,
    },
}
