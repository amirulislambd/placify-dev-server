# 🚀 Placify - Backend Engine

Placify is a robust, scaleable, and role-based Job Hunting Portal API built on top of Node.js, Express.js, and MongoDB. It supports dynamic job matching, subscription handlings, status workflows, and detailed reporting statistics for multiple user archetypes (Seekers, Recruiters, and Administrators).

---

## ✨ Features Summary

### 🔑 Authentication & Session Guard
*   **Token-Based Verification:** Custom middleware intercepts requests via localized session tokens mapping to MongoDB user items.
*   **Role-Based Access Control (RBAC):** Strict pipeline verification tiers:
    *   `verifySeeker`: Restricts scope to active job hunters.
    *   `verifyRecruiter`: Secures resource allocation to corporate entities.
    *   `verifyAdmin`: Unlocks comprehensive global site controls. 

### 💼 Jobs Engine
*   **Advanced Filtering API:** Supports partial keyword query parameters (`q`) matching titles, companies, categories, or locations via case-insensitive regex flags.
*   **Categorized Pagination:** Multi-conditional query support tracking `jobType`, `workMode`, dynamic pricing bands (`salary`), and active statuses.
*   **Featured Job Listings:** Quick pipeline fetching targeted listings for lightweight landing page hydration.

### 📊 Real-time Dynamic Statistics (`/api/stats`)
A single, heavily integrated metrics API adapting dynamically to context user-roles:
*   **Admin Mode:** Global system metrics tracking multi-collection totals (Users, Companies, Jobs, Pending corporate registration approvals, and aggregate estimated platform revenue).
*   **Recruiter Mode:** Aggregates overall performance metrics of job listings alongside live data analysis regarding cross-collection unique application sub-counts.
*   **Seeker Mode:** Aggregates real-time application trackers detailing current workflow states (`applied`, `pending`, `interview`, or `rejected`).

### 📦 Subscription & Company Architecture
*   **Tier Management:** Exposes decoupled subscription plans mapping tier IDs directly to localized user properties upon successful billing transactions.
*   **Relational Mapping aggregates:** Generates live structural metrics combining data to automatically compute aggregate open job counts per business profile.

---

## 🛠️ Technology Stack

*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** MongoDB (Official Node.js Native Driver)
*   **Security & Helpers:** Cross-Origin Resource Sharing (`cors`), `dotenv`, custom stateful session authentication tokens.

---

## 📂 Database Schema Overview (`placify_db`)

The backend interfaces natively across 8 core ecosystem collections:
*   `user` - Profiles containing security scopes, user bios, and active subscription plan configurations.
*   `session` - Server-side reference tokens controlling user authenticity states.
*   `jobs` - Core technical specifications, corporate scopes, constraints, and salaries.
*   `companies` - Corporate structures linked to individual managing recruiters.
*   `applications` - Relational maps bridging seekers to specific open job IDs.
*   `plans` - Static configuration data mapping active tier features.
*   `subscriptions` - Ledger logs tracking verified transactions and current active upgrades.

---

## ⚙️ Local Installation & Development Setup

Follow these simple steps to spin up the local development instance:

### 1. Clone the Project
```bash
git clone [https://github.com/YOUR_GITHUB_USERNAME/placify-backend.git](https://github.com/YOUR_GITHUB_USERNAME/placify-backend.git)
cd placify-backend