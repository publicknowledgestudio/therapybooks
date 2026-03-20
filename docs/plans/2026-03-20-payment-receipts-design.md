# Payment Receipts — Design

## Overview

Auto-generated payment receipts that serve as proof of payment for clients. Receipts are created automatically when a payment is allocated to sessions via FIFO. No manual creation flow.

## Auto-generation trigger

After `allocateSessionPayments()` runs (statement import, cash payment, manual reallocation), compare resulting `session_payments` against existing receipts. Newly-paid sessions not already on a receipt get grouped into a new receipt tied to that payment.

## Data model

Rename `invoices` table to `receipts`:

| Field | Type | Notes |
|-------|------|-------|
| id | serial PK | |
| user_id | uuid FK | |
| receipt_number | integer | sequential per therapist, displayed as #001 |
| client_id | integer FK | |
| date | date | payment date |
| amount | numeric | total paid |
| status | text | `generated` or `void` |
| payment_method | text | `bank` or `cash` |
| transaction_id | integer FK | nullable, links to bank transaction |
| created_at | timestamptz | |

New join table `receipt_sessions`:

| Field | Type | Notes |
|-------|------|-------|
| id | serial PK | |
| receipt_id | integer FK | |
| session_id | integer FK | |
| amount | numeric | portion allocated to this session |

Drop unused columns from old invoices table: `description`, `pdf_path`.
Drop unused statuses: `draft`, `sent`, `paid` → replace with `generated`, `void`.

## Therapist profile fields (Settings page)

Add optional fields to `therapist_settings`:
- `pan_number` (text)
- `registration_number` (text)
- `clinic_address` (text)

These appear on receipts when filled in.

## Public receipt page

URL: `/receipt/[id]`

Public, no login required. Clean minimal layout:

- **Header**: Therapist name, phone, email, clinic address, PAN, registration number (only what's filled in)
- **Receipt info**: Receipt #001, date
- **Client**: name
- **Sessions table**: date | duration | rate
- **Total**: amount paid
- **Payment method**: Bank Transfer / Cash
- **Print button**: top right, hidden via `@media print` CSS

## Receipts list page

URL: `/receipts` (sidebar: "Payment Receipts", between Bank Statement and Booking Link)

Table columns:
- # (receipt number)
- Client
- Date
- Amount
- Actions: Copy Link, Send via WhatsApp, Void

Filters: client, date range.
Click row → opens public receipt page in new tab.

## WhatsApp sharing

"Send via WhatsApp" opens: `https://wa.me/{client_phone}?text=Hi {name}, here's your payment receipt: {url}`

"Copy Link" copies the public receipt URL to clipboard.

## Navigation

Sidebar order:
1. Dashboard
2. Clients
3. Appointments
4. Bank Statement
5. **Payment Receipts** ← new
6. Booking Link
