# BoardTopper AI — Launch Checklist

Use this checklist before going live. Every item must be ticked.

---

## Pre-Launch Technical Checklist

- [ ] Railway deploy logs show no errors
- [ ] `/health` endpoint returns `{"data":{"status":"ok"}}`
- [ ] Vercel build succeeds (no TypeScript errors)
- [ ] Login / signup works end-to-end (Frontend → Railway → Supabase)
- [ ] `CORS_ORIGIN` on Railway matches your exact Vercel URL (no trailing slash)
- [ ] Supabase RLS policies allow your backend's service key to read/write
- [ ] Email sending works (test via Resend dashboard)
- [ ] Password reset flow works end-to-end
- [ ] Subscription upgrade flow works (Razorpay → webhook → DB update)
- [ ] Subscription expiry cron job is configured in Railway

---

## Razorpay KYC Checklist (verify before submitting merchant docs)

- [ ] Refund & Cancellation Policy live at `/refund` with specific timelines
      (5–7 business days for cards, 2–3 business days for UPI/net banking — stated explicitly)
- [ ] Privacy Policy live at `/privacy` with data collection details
- [ ] Terms of Service live at `/terms`
- [ ] Contact Us page (`/contact`) has physical address, support email,
      billing email, and Grievance Officer details filled in
- [ ] Footer on every page links to all 4 policy pages:
      `/privacy`, `/terms`, `/refund`, `/contact`
- [ ] Razorpay merchant account opened under a parent/guardian name
      (required — account holder must be 18+, Indian Contract Act)
- [ ] Razorpay dashboard → Settings → Business Website Details:
      add your live domain and verify it
- [ ] Webhook URL configured in Razorpay dashboard
      (URL: `https://YOUR_RAILWAY_URL/api/payments/webhook`)
- [ ] Test a ₹1 payment end-to-end in **test mode** before going live
- [ ] GST number added to Razorpay business profile (if applicable)
- [ ] PAN card of account holder (parent/guardian) uploaded to Razorpay KYC
- [ ] Live mode keys (`rzp_live_...`) set in Railway env vars before going live
      (swap out the `rzp_test_...` keys)

---

## Legal / Compliance Checklist

- [ ] Grievance Officer details on Contact Us page are live and correct
- [ ] Registered address on Contact Us page is correct
- [ ] Privacy Policy reviewed — accurately describes data collection,
      Supabase storage, and Google OAuth data handling
- [ ] Terms of Service reviewed — subscription terms match actual pricing
- [ ] Refund Policy is Razorpay-compliant (no "7-day no-questions-asked" language)

---

## Post-Launch Monitoring

- [ ] Set up Railway log alerts for 5xx errors
- [ ] Monitor Razorpay webhook delivery success rate (Dashboard → Webhooks → Logs)
- [ ] Confirm first real payment goes through and subscription activates correctly
- [ ] Confirm Supabase DB shows correct `plan = 'pro'` after payment
