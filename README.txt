PDFMINT v1.8 — ACCESS AND PAYMENT FLOW

NEW CHECKOUT FLOW
1. User finishes editing and clicks Done.
2. User selects PDF format and confirms the filename.
3. User enters a valid email address, or uses the Google/Apple demonstration
   buttons.
4. A full-screen access-plan page opens.
5. User selects an access type and clicks Continue.
6. A full payment page opens with:
   - Card and PayPal tabs
   - Cardholder, card number, expiry, CVC and postcode fields
   - Order summary
   - Selected-plan pricing and renewal disclosure
   - Document preview
   - Checkout progress indicator

ACCESS OPTIONS INCLUDED
- 7-day limited access: £0.50, no automatic renewal
- 7-day full access: £1 today, then £24.90 every four weeks
- Annual plan: £24.90 per month

PAYMENT STATUS
This release builds the complete front-end layout only. Card and PayPal buttons
open a clear demonstration notice. They do not process a payment and do not
download the PDF.

IMPORTANT
Before accepting real payments, the following must be added:
- A secure backend
- A payment provider
- Server-created payment sessions
- Webhook confirmation
- Subscription and cancellation management
- Clear consumer disclosures and consent records
- Download release only after verified payment

DEPLOYMENT
Replace all files in the GitHub repository with this package, commit, wait for
Sevalla to redeploy, then hard-refresh the application.
