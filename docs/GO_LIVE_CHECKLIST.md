
# Go-Live Checklist

This is the final pre-flight before flipping the Jumpstride production deployment
public. Work through it top to bottom; the order is the order in which downstream
items depend on upstream items being correct.

## Backend (Render / Railway / VPS)

- [ ] `MONGODB_URI` set to production Atlas cluster
- [ ] `JWT_SECRET` set (min 32 chars, not the default in `.env.example`)
- [ ] `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` set (live keys, not `rzp_test_*`)
- [ ] `RAZORPAY_WEBHOOK_SECRET` set
- [ ] `ANTHROPIC_API_KEY` set (only required if `npm run translate:questions:gu` will be run from production)
- [ ] `ADMIN_EMAIL` + `ADMIN_PASSWORD` set
- [ ] `NODE_ENV=production`
- [ ] `BACKEND_URL` set to the production backend domain (used in payment redirects + email links)
- [ ] `CORS_ALLOWED_ORIGINS` includes the production frontend domain
- [ ] `GOOGLE_CLIENT_ID` set (only if Google login is enabled)
- [ ] `npm run seed:admin`
- [ ] `npm run seed:assessment`
- [ ] `npm run seed:demo-package`
- [ ] `npm run seed:gujarati-package`
- [ ] `npm run migrate:jumpstart-ids`
- [ ] `npm run smoke:career-500q` — must print `[OK] All scoring contracts pass` for every scenario

## Frontend (Vercel)

- [ ] `VITE_API_URL` set to production backend URL (e.g. `https://jumpstart-rwuc.onrender.com/api`)
- [ ] `VITE_RAZORPAY_KEY_ID` set (live key, matches backend's `RAZORPAY_KEY_ID`)
- [ ] `VITE_GOOGLE_CLIENT_ID` set if Google login is enabled
- [ ] Production build passes — `npm run build` exits 0 with no warnings beyond pre-existing canonical-class lints
- [ ] `vercel.json` cache headers confirmed (immutable for `/assets/`, `/question-media/`, `.js`, `.css`)
- [ ] Custom domain configured in the Vercel dashboard
- [ ] SSL certificate active (auto via Vercel)
- [ ] SPA fallback rewrite confirmed (`/(.*) → /index.html`) so deep-link refreshes don't 404

## Database

- [ ] MongoDB Atlas IP whitelist updated for the production server's IP (or `0.0.0.0/0` if behind a managed PaaS)
- [ ] Indexes created — confirmed by `db.users.getIndexes()`: `selectedPackageId`, `assessmentReports.publication.status`, `purchaseHistory.status`, plus the auto-built indexes for `email` and `jumpstartId`
- [ ] Admin account seeded and login confirmed against the production frontend
- [ ] Atlas backup schedule on (at least daily, retain ≥7 days)
- [ ] Production DB user has the minimum role set (`readWrite` on the app DB, no admin)

## Payment integration

- [ ] Razorpay account is in **live mode**, not test mode
- [ ] Razorpay webhook endpoint registered (URL = `${BACKEND_URL}/api/v1/...` payments webhook)
- [ ] At least one ₹1 test transaction completed end-to-end on the live keys, refunded immediately
- [ ] Coupon redemption tested with a real (deactivated-afterwards) coupon

## Final checks (smoke a real user flow)

- [ ] Register a new student account end-to-end
- [ ] Complete the mandatory student profile form (school, class, city, state, etc.)
- [ ] Take the demo test (50Q) end-to-end — all 5 sections, submit, no errors
- [ ] Admin approves the demo test report from `/admin/testsubmissions/<id>`
- [ ] Student views the approved report at `/result/<id>` — student info card on page 1, findings from page 2
- [ ] Admin "View Student Report" button opens the correct report in a new tab (ungated, even pre-approval)
- [ ] Coupon creation in admin Settings → Coupons works
- [ ] Coupon redemption applies the discount on `/payment` and the admin Payments table shows the trail
- [ ] Gujarati test package visible on `/test` page with `ગુજરાતી` badge
- [ ] Site UI is English everywhere — language toggle is gone from the header on both desktop and mobile
- [ ] PDF download works on the live URL (test report page → Download button → opens system print → PDF saves correctly)
- [ ] Career detail page (`/careerdetail?career=...`) opens correctly for at least 3 different careers (one tech, one non-tech, one Indian-specific)
- [ ] Section 4 answer key generated via `npm run export:answer-key` and stored in a shared location for counsellors

## Performance + accessibility

- [ ] Lighthouse run on the production URL — Performance score recorded for `/`, `/test`, `/dashboard`, `/result/:id`
- [ ] Page load on mobile checked under DevTools 3G throttling — first content paint < 3s on `/`
- [ ] PageLoader fallback verified (clear browser cache → load any lazy route → spinner shown briefly, then page)
- [ ] No console errors on the live URL for any of the smoked routes

## Observability + recovery

- [ ] Backend logs accessible (Render dashboard logs, or equivalent)
- [ ] An error from `/api/v1/...` surfaces in logs within 1 minute of being triggered
- [ ] Database connection-failure path tested — backend restart recovers automatically
- [ ] A rollback plan exists — last known-good commit SHA recorded; redeploy procedure documented

## Sign-off

- [ ] Client / project owner has walked through the report PDF and the admin review flow on the live URL
- [ ] Support email / WhatsApp number on the footer + counselling booking page is the correct one
- [ ] Privacy Policy + Terms of Service pages render and reflect the live domain
- [ ] Go-live announcement message drafted and ready to send
