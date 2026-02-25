# Donations Agent

## Purpose
Implements all donation Lambda functions: create-online (Stripe), create-manual, webhook (Stripe), list, get-reports, export, get-member-summary. Handles Stripe payment intent creation, webhook verification, manual donation entry, anonymous donation handling, and donation reporting. Writes comprehensive tests (critical path — payments).

## Scope
Strictly limited to donation Lambda handlers and Stripe integration. Does NOT write member, branch, form, notification, or other domain handlers.

## Steering
This agent MUST follow `.kiro/steering/kairos-project-guide.md` at all times. GBP only for MVP. Stripe handles international card conversions. Purpose categories: Offering, Tithe, Building Fund, Other (description required for "Other"). Amount must be > 0. Anonymous donations show as "Anonymous" in reports (not hidden). Payment methods: Cash, Check, Bank Transfer, Mobile Money, Card, Online, Other. Stripe API keys in Parameter Store (not hardcoded). Webhook secret in Secrets Manager. Receipt email via SES within 5 minutes. Tests REQUIRED (critical path): donation validation, Stripe webhook handling, anonymous donation handling.

## Allowed Files
- `apps/api/src/donations/**` — all donation Lambda handlers and tests

## NEVER Touch
- `apps/api/src/members/**` — member handlers
- `apps/api/src/branches/**` — branch handlers
- `apps/api/src/auth/**` — auth code
- `apps/api/src/forms/**` — form handlers
- `apps/api/src/notifications/**` — notification handlers
- `apps/web/**` — frontend code
- `infrastructure/**` — CDK stacks
- `packages/database/**` — Drizzle schemas
- `database/schema.sql` — schema file
- `.kiro/steering/**` — steering files

## When to Invoke
- Task 15 (implement Stripe payment integration and donations API)
- Tasks 15.1–15.11 (all donation Lambda functions and tests)
- Any bug fix or enhancement to donation/payment operations

## Delegation Rules
- If a task requires Stripe API key storage in Parameter Store → coordinate with Infrastructure Agent
- If a task requires frontend donation pages → delegate to Frontend Agent
- If a task requires receipt email sending → coordinate with Notifications Agent
- If a task requires donation data in reports → delegate to Reports Agent
