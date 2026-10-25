# LifeLink — Intelligent Organ Donation Matching & Allocation System

LifeLink is a database-driven web application designed to demonstrate how organ donation records, recipient waiting lists, compatibility checks, allocation workflows, and transplant records can be managed in one place.

The project combines a Next.js web interface with PostgreSQL for structured relational data and MongoDB for audit logs.

> **Disclaimer:** LifeLink is an educational college project, not a clinical decision-support system. Its simplified matching logic must not be used for real organ allocation or medical decisions.

## Features

- **Dashboard:** Overview of donors, organs, recipients, waiting lists, and allocations.
- **Donor management:** Register donors and track consent status.
- **Organ management:** Record organs, their types, blood groups, hospitals, and availability.
- **Recipient management:** Register recipients and maintain waiting-list entries.
- **Waiting list:** View recipients and their priority information.
- **Compatibility checks:** Demonstrate simplified organ-type and ABO blood-group matching.
- **Allocation management:** Create allocations with database transaction handling and safeguards against duplicate active allocations.
- **Transplant records:** Record transplant outcomes and update related statuses.
- **Hospital management:** View participating hospitals.
- **Audit logs:** Store application activity records in MongoDB.
- **Health endpoint:** Check connectivity to PostgreSQL and MongoDB.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, CSS |
| Backend | Next.js App Router API Routes |
| Relational database | PostgreSQL |
| Document database | MongoDB |
| Database connectivity | `pg`, MongoDB Node.js driver |
| Local environment | Docker Compose |
| Version control | Git and GitHub |

## Project Structure

```text
lifelink-organ-donation-system/
├── database/
│   ├── schema.sql
│   └── seed.sql
├── frontend/
│   ├── app/
│   │   ├── api/
│   │   ├── allocations/
│   │   ├── audit-logs/
│   │   ├── donors/
│   │   ├── hospitals/
│   │   ├── organs/
│   │   ├── recipients/
│   │   ├── transplants/
│   │   └── waiting-list/
│   ├── components/
│   ├── lib/
│   ├── package.json
│   └── .env.local
├── docker-compose.yml
└── README.md
```

## Prerequisites

Install the following before running the project:

- Node.js and npm
- Docker Desktop
- Git

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/i-ayushi-k/lifelink-organ-donation-system.git
cd lifelink-organ-donation-system
```

### 2. Start the databases

From the project root, run:

```bash
docker compose up -d
docker compose ps
```

Wait for both database containers to become ready.

### 3. Configure environment variables

Create `frontend/.env.local` with the local development values used by this project:

```env
DATABASE_URL=postgresql://organ_admin:organ_dev_password@localhost:5433/organ_donation

MONGODB_URI=mongodb://organ_admin:organ_mongo_dev_password@localhost:27018/?authSource=admin

MONGODB_DB=organ_donation_docs
```

These are local development credentials, not production credentials. Use strong, private credentials for any deployed environment. Never commit `.env.local`.

### 4. Initialize PostgreSQL

From the project root, run these PowerShell commands:

```powershell
Get-Content .\database\schema.sql | docker exec -i organ-postgres psql -U organ_admin -d organ_donation

Get-Content .\database\seed.sql | docker exec -i organ-postgres psql -U organ_admin -d organ_donation
```

The schema creates the relational tables and constraints. The seed script inserts sample data for development and demonstration.

Run the seed script only when appropriate; repeated execution may create duplicate sample records if the script is not idempotent.

### 5. Install frontend dependencies

```powershell
cd frontend
npm install
```

### 6. Start the application

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Check database connectivity |
| `GET /api/dashboard` | Retrieve dashboard statistics |
| `/api/donors` | Retrieve and register donors |
| `/api/organs` | Retrieve and register organs |
| `/api/recipients` | Retrieve and register recipients |
| `GET /api/hospitals` | Retrieve hospitals |
| `GET /api/waiting-list` | Retrieve waiting-list records |
| `/api/allocations` | Retrieve and create allocations |
| `/api/transplants` | Retrieve and create transplant records |
| `GET /api/audit-logs` | Retrieve recent audit logs |

Endpoints supporting creation use `POST` requests. Request validation and database constraints help protect data integrity.

## Database Design

**PostgreSQL** stores the main relational data:

- Hospitals
- Users
- Donors
- Organs
- Recipients
- Waiting lists
- Allocations
- Transplants

**MongoDB** stores flexible audit documents containing activity details, metadata, and timestamps.

The allocation workflow uses database transactions and locking to reduce conflicting allocations. A database constraint also prevents an organ from having multiple active allocations.

The compatibility rules are simplified for demonstration and do not implement the full medical, legal, logistical, or clinical criteria required for real-world transplantation.

## Verification

The development workflow includes checks for:

- PostgreSQL and MongoDB connectivity
- Dashboard statistics
- Donor, organ, and recipient management
- Waiting-list display
- Allocation creation and status updates
- Transplant workflow
- Audit-log retrieval

## Future Improvements

- Authentication and role-based access control
- More comprehensive validation and error handling
- Automated integration tests
- Production-ready secrets management
- Deployment and monitoring
- Enhanced audit reliability and reporting
- Clinically validated matching rules, developed only with appropriate domain experts and governance
---

*Developed as an educational database and full-stack web application project.*
