# PDFMint Google and Brevo setup

## Google sign-in branding

1. In Google Cloud, open Google Auth Platform > Branding.
2. Set the app name to PDFMint and add the PDFMint logo, support email, home page, privacy policy and terms links.
3. Add and verify the final PDFMint domain, then publish the app to Production when ready.
4. To remove the Supabase project hostname from Google's consent screen entirely, configure a Supabase custom domain such as `auth.pdfmint.com`.
5. After the custom auth domain is active, replace the Google OAuth redirect URI with `https://auth.pdfmint.com/auth/v1/callback` and test sign-in again.

Use the final public PDFMint domain for this work, rather than the temporary Kinsta hostname.

## Brevo transactional email

1. Authenticate the PDFMint sending domain in Brevo using the DNS records Brevo provides.
2. Create a transactional sender such as `accounts@pdfmint.com` with sender name `PDFMint`.
3. In Brevo, create an SMTP key.
4. In Supabase Auth SMTP settings use:
   - Host: `smtp-relay.brevo.com`
   - Port: `587`
   - Username: the Brevo SMTP login
   - Password: the Brevo SMTP key
   - Sender name: `PDFMint`
   - Sender email: the authenticated PDFMint sender
5. Update the Supabase confirmation, password reset and email-change templates to use PDFMint branding.

Purchase, renewal, failed-payment and cancellation emails should be sent from a secure server-side payment webhook through the Brevo transactional API. Never place the Brevo API key in `config.js` or browser JavaScript.

Do not email generated passwords. Send a secure password-setup or reset link instead.
