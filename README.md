# Telugu Cartoon Hub

Build a complete, professional, production-quality digital product store called **Telugu-Toon-World**.

## CORE PURPOSE

This website has ONE purpose:

**Sell subscriptions/access to a private Telegram channel.**

The private Telegram channel contains Telugu cartoon/animated entertainment content.

The website itself does NOT host, stream, or sell individual cartoon videos.

Customers purchase one of the two available subscription plans and, after their UPI payment is manually verified by the admin, they receive access to the private Telegram channel.

The entire website should be designed around this single purchase flow.

---

# 1. BRAND

### Brand Name

**Telugu-Toon-World**

### Tagline

**"Your World of Telugu Cartoons"**

Alternative hero text:

**"Enter the World of Telugu-Toon-World"**

Supporting text:

**"Get premium access to our private Telegram channel and enjoy our exclusive cartoon collection."**

Create an original, colorful cartoon-inspired logo for Telugu-Toon-World.

Do NOT copy Disney, Cartoon Network, Netflix, or another company's branding.

---

# 2. MAIN NAVIGATION

Create a clean responsive navbar.

### Desktop

**Logo | Home | Plans | About | Dashboard**

Right side:

**Get Access**

If logged in:

**Dashboard**

Profile menu

### Mobile

* Logo
* Menu button
* Get Access button

---

# 3. HOME PAGE

Create a highly polished cartoon-themed landing page.

## HERO

Large heading:

**"Welcome to Telugu-Toon-World"**

Subheading:

**"Unlock premium access to our private Telegram cartoon world."**

Primary button:

**Get Premium Access**

Secondary button:

**View Plans**

Hero visual:

* Original cartoon-inspired characters
* Colorful background
* Stars
* Clouds
* Floating cartoon objects
* Soft animations
* Premium gradients

Do not make it look like a generic children's website.

It should feel like a **premium digital membership store**.

---

# 4. 20 CARTOON-THEMED CATEGORIES

Because this website is only selling Telegram access, these are NOT separate products.

Create a visual section showing the type of cartoon content available inside the Telegram channel.

Title:

**"Explore Our Cartoon World"**

Display 20 attractive category cards:

1. Adventure
2. Comedy
3. Action
4. Fantasy
5. Superheroes
6. Classic Cartoons
7. Kids
8. Family
9. Animals
10. Mystery
11. Sci-Fi
12. Magical
13. Friendship
14. School
15. Sports
16. Space
17. Monsters
18. Heroes
19. Funny Moments
20. New Arrivals

Each card should contain:

* Original cartoon-style artwork
* Category name
* Short description
* Small icon
* Hover animation

Add a message:

**"All content is available through our private Telegram community."**

Do NOT create individual purchase buttons for these categories.

---

# 5. WHY TELUGU-TOON-WORLD

Create four premium feature cards.

### 🎬 Premium Cartoon Collection

Access our curated cartoon collection through the private Telegram channel.

### 📱 Mobile Friendly

Enjoy access from your phone, tablet, or desktop.

### ⚡ Simple Access

Purchase your plan and receive Telegram access after payment verification.

### 🔐 Private Community

Access is provided only to approved customers.

---

# 6. PLANS PAGE

Create:

`/plans`

There are exactly **TWO subscription plans**.

Use the exact names, prices, durations, and benefits from the reference image I provide.

Do not create additional plans.

Each plan should contain:

* Plan name
* Price
* Duration
* Benefits
* Coupon input
* Final price
* Purchase button

Example layout:

### PLAN 1

**₹XX**

**Choose Plan**

---

### PLAN 2

**₹XX**

**MOST POPULAR**

**Choose Premium**

Make the second plan visually prominent if it is the recommended plan.

---

# 7. PLAN-SPECIFIC COUPONS

Coupons are separate for each plan.

For example:

Plan 1 coupon:

`TOON10`

Plan 2 coupon:

`TELUGU50`

A coupon assigned to Plan 1 must NEVER work on Plan 2.

Backend validation must check:

* Coupon exists
* Coupon active
* Coupon not expired
* Usage limit
* Selected plan matches coupon's plan
* Correct discount

Show:

**"Coupon applied successfully!"**

or:

**"This coupon is not valid for this plan."**

---

# 8. CHECKOUT

After clicking a plan:

Open:

`/checkout`

Display:

## ORDER SUMMARY

Plan
Original price
Coupon
Discount
Final price

Then:

## CUSTOMER DETAILS

* Name
* Email
* Mobile number

Then:

## UPI PAYMENT

Display:

**Pay using any UPI app**

UPI ID:

### `9848779490@fam`

Add:

**Copy UPI ID**

button.

Create a UPI QR code for the payment.

Add:

**Open UPI App**

button on supported mobile devices.

Show the exact amount that the customer needs to pay.

---

# 9. PAYMENT SUBMISSION

After making the UPI payment, customer returns to the website.

Show:

### "Have you completed your payment?"

Button:

**I Have Completed Payment**

Then ask for:

### UTR / Transaction Reference Number

Customer submits the UTR.

Create a unique order ID.

Example:

`TTW-2026-000123`

Order status becomes:

### 🟡 PAYMENT PENDING

IMPORTANT:

Never automatically mark the payment as successful simply because the customer clicked the button.

The customer is only submitting a payment claim.

---

# 10. PAYMENT STATUS

Create:

`/payment-status`

Display:

### Pending

🟡 **Payment Verification Pending**

"Your payment has been submitted successfully and is waiting for admin verification."

Display:

* Order ID
* Plan
* Amount
* UTR
* Submitted time
* Current status

Button:

**Refresh Status**

---

# 11. ADMIN VERIFICATION

Create a secure:

`/admin`

dashboard.

Admin receives all payment submissions.

Admin sees:

* Order ID
* Customer
* Mobile
* Email
* Plan
* Amount
* Coupon
* UTR
* Payment date
* Status

Statuses:

🟡 Pending

🟢 Completed

🔴 Failed / Rejected

Admin buttons:

**Accept Payment**

**Reject Payment**

---

# 12. ACCEPT PAYMENT

When admin clicks:

**Accept Payment**

show confirmation:

**"Have you verified this UPI payment?"**

After confirmation:

1. Payment status → COMPLETED
2. Record approval timestamp
3. Record approving admin
4. Unlock Telegram access
5. Update customer dashboard
6. Show Telegram Join button

Customer sees:

# 🎉 PAYMENT APPROVED

**"Your payment has been successfully verified."**

Then:

### JOIN PRIVATE TELEGRAM

button.

---

# 13. TELEGRAM ACCESS

The private Telegram channel is:

`https://t.me/+V3V6h5fxHWozZGZl`

This is the ONLY Telegram product being sold.

Do NOT show the Telegram invite link publicly.

Do NOT display it on:

* Home page
* Plans page
* About page
* Public source/configuration where avoidable

Only make the Telegram access available after the customer's order has been approved.

Access condition:

`payment_status = COMPLETED`

If:

`PENDING`

→ No Telegram access.

If:

`REJECTED`

→ No Telegram access.

If:

`COMPLETED`

→ Telegram access unlocked.

---

# 14. CUSTOMER DASHBOARD

Create:

`/dashboard`

The dashboard should be the customer's personal account area.

## Overview

Display:

**Welcome, [Customer Name]**

Cards:

* Current Plan
* Payment Status
* Access Status
* Purchase Date

---

## MY PURCHASE

Show:

* Plan
* Amount
* Order ID
* Purchase date
* Payment status

---

## TELEGRAM ACCESS

If payment is pending:

🟡

**Waiting for Payment Verification**

If approved:

🟢

**Premium Access Unlocked**

Button:

**JOIN TELEGRAM CHANNEL**

If rejected:

🔴

**Payment Rejected**

---

## ORDER HISTORY

Show previous purchases:

* Order ID
* Plan
* Amount
* Date
* Status

---

# 15. ABOUT PAGE

Create:

`/about`

Title:

**About Telugu-Toon-World**

Explain:

"Telugu-Toon-World is a premium digital access platform created for cartoon lovers who want a simple way to access our private Telegram community."

Sections:

### What We Offer

* Premium cartoon-focused community
* Private Telegram access
* Simple UPI payment
* Manual payment verification
* Easy customer dashboard

### How It Works

**1. Choose a Plan**

↓

**2. Pay Using UPI**

↓

**3. Submit UTR**

↓

**4. Admin Verifies Payment**

↓

**5. Telegram Access Unlocked**

---

# 16. ADMIN DASHBOARD

Create a professional admin dashboard.

Sidebar:

**Dashboard**

**Payments**

**Pending**

**Completed**

**Rejected**

**Coupons**

**Plans**

**Customers**

**Payment History**

**Settings**

**Clear Data**

**Logout**

---

# 17. ADMIN OVERVIEW

Display:

### Total Revenue

₹XX,XXX

### Total Orders

XXX

### Pending

XX

### Completed

XX

### Rejected

XX

### Active Customers

XX

Add charts for:

* Revenue
* Orders
* Payment status
* Plan popularity
* Coupon usage

---

# 18. ADMIN PAYMENT HISTORY

Create a searchable payment table.

Columns:

**Order ID | Customer | Plan | Amount | UTR | Status | Date | Action**

Filters:

* All
* Pending
* Completed
* Rejected

Search:

* Order ID
* Customer
* Phone
* Email
* UTR

---

# 19. ADMIN COUPONS

Admin can:

* Create coupon
* Edit coupon
* Disable coupon
* Delete coupon
* Select applicable plan
* Set discount
* Set expiry
* Set maximum usage
* View usage

Example:

| Coupon    | Applicable Plan | Discount | Status |
| --------- | --------------- | -------- | ------ |
| TOON10    | Plan 1          | 10%      | Active |
| PREMIUM50 | Plan 2          | ₹50      | Active |

The backend must enforce the plan restriction.

---

# 20. ADMIN PLAN MANAGEMENT

Admin can manage the two plans.

Fields:

* Plan name
* Price
* Duration
* Description
* Benefits
* Active/inactive
* Recommended badge

Do not hardcode these values in the frontend.

---

# 21. ADMIN CUSTOMER MANAGEMENT

Display:

* Customer name
* Email
* Phone
* Plan
* Order count
* Total spent
* Telegram access status
* Registration date

Admin can view customer purchase history.

---

# 22. CLEAR DATA

Create a dangerous-zone:

### CLEAR DATA

Do NOT immediately delete data.

Show confirmation:

**"This action permanently deletes data and cannot be undone."**

Require:

* Admin authentication
* Confirmation
* Second confirmation

Allow:

**Clear Pending Payments**

**Clear Completed Payments**

**Clear Rejected Payments**

**Clear Coupons**

**Clear Customers**

**Clear All Data**

Do not allow customers to access this feature.

---

# 23. DATABASE

Use Supabase.

Create:

### users

* id
* name
* email
* phone
* created_at

### plans

* id
* name
* price
* duration
* features
* active
* created_at

### coupons

* id
* code
* plan_id
* discount_type
* discount_value
* max_uses
* used_count
* expires_at
* active
* created_at

### orders

* id
* order_id
* user_id
* plan_id
* coupon_id
* original_amount
* discount_amount
* final_amount
* utr
* payment_status
* telegram_access
* approved_at
* rejected_at
* approved_by
* created_at

### admin_users

* id
* email
* role
* created_at

Use Row Level Security.

---

# 24. SECURITY

The customer must NEVER be able to:

* Approve their own payment
* Change payment status
* Change price
* Change coupon discount
* Access Telegram before approval
* Access another customer's order
* Access admin
* Delete payment records

All important calculations and permissions must be verified server-side.

Never expose private database credentials in frontend code.

---

# 25. VISUAL DESIGN

Make Telugu-Toon-World look like a premium cartoon membership brand.

Use:

* Dark navy background
* Purple/blue gradients
* Yellow/orange highlights
* Glassmorphism
* Rounded cards
* Premium shadows
* Cartoon-inspired illustrations
* Floating shapes
* Smooth Framer Motion animations
* Modern typography

Avoid making the UI childish or cluttered.

The design should feel like:

**Premium Digital Store + Cartoon Universe**

rather than a basic cartoon website.

---

# 26. FOOTER

### Telugu-Toon-World

"Your World of Telugu Cartoons"

Navigation:

Home
Plans
About
Dashboard

Support:

Contact
Payment Help
FAQ

Legal:

Terms
Privacy
Refund Policy

Copyright:

**© 2026 Telugu-Toon-World. All rights reserved.**

---

# 27. COMPLETE USER JOURNEY

The final website must follow exactly:

**HOME**

↓

**VIEW CARTOON-THEMED CONTENT CATEGORIES**

↓

**PLANS**

↓

**SELECT ONE OF TWO PLANS**

↓

**APPLY PLAN-SPECIFIC COUPON**

↓

**CHECKOUT**

↓

**PAY ₹XX USING UPI**

↓

**9848779490@fam**

↓

**RETURN TO WEBSITE**

↓

**SUBMIT UTR**

↓

**PAYMENT PENDING**

↓

**ADMIN VERIFIES PAYMENT**

↓

### APPROVED

↓

**CUSTOMER DASHBOARD UPDATED**

↓

**TELEGRAM ACCESS UNLOCKED**

↓

**JOIN PRIVATE TELEGRAM CHANNEL**

---

# 28. IMPORTANT

This website is NOT a cartoon streaming platform.

It is NOT selling individual cartoon videos.

It is a **digital subscription/access store for Telugu-Toon-World's private Telegram channel**.

The 20 cartoon categories are only used to visually communicate the type of content available inside the private community.

The primary product is:

### "Private Telegram Channel Access"

There are exactly **two subscription plans**.

The payment method is UPI.

The payment UPI ID is:

**9848779490@fam**

Payment verification is manually performed by the admin.

Telegram access is provided ONLY after admin approval.

Build the entire application around this workflow and make every page, component, database table, and user flow consistent with it.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://telugu-toon-access.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/923ff299-681b-47b3-a5ef-e3c0a403d71c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
