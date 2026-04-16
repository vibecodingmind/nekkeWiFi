---
Task ID: 1
Agent: Super Z (Main)
Task: Design and build complete ISP Billing SaaS Platform

Work Log:
- Analyzed requirements: Multi-tenant SaaS for ISPs with networking device integration (MikroTik, TP-Link, Ubiquiti, etc.)
- Created comprehensive Prisma schema with 12 models: Organization, OrgUser, Customer, Device, DeviceInterface, ProvisioningRule, Plan, Subscription, UsageRecord, Invoice, InvoiceLineItem, Payment
- Pushed schema to SQLite database via Prisma
- Created seed script with realistic Tanzanian ISP data: 2 organizations, 6 users, 38 customers, 8 devices with interfaces, 10 plans, 16 provisioning rules, 28 subscriptions, 690 usage records, 69 invoices, 31 payments
- Built 16 API routes (GET/POST/PUT/DELETE) for dashboard, organizations, customers, devices, plans, subscriptions, usage, invoices, payments, and reports
- Built complete SPA frontend with 11 components: main layout page + 10 page components
- All code passes ESLint with zero errors
- Dev server running successfully on port 3000

Stage Summary:
- Complete ISP Billing SaaS platform built as Next.js 16 SPA
- Database seeded with comprehensive demo data (Tanzanian ISPs)
- 16 API routes for all CRUD operations
- 10 frontend pages: Dashboard, Organizations, Customers, Plans, Devices, Subscriptions, Usage Metering, Invoices, Payments, Reports
- Device integration support for MikroTik, TP-Link, Ubiquiti, Cisco, Juniper, Generic routers
- Multi-tenant architecture with organization-based data isolation
- All files in /home/z/my-project/
