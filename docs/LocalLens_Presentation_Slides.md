---
marp: true
theme: gaia
_class: lead
paginate: true
backgroundColor: #18221D
color: #EAEBE8
style: |
  section {
    font-family: 'DM Sans', sans-serif;
    padding: 40px;
  }
  h1, h2, h3 {
    font-family: 'Manrope', sans-serif;
    color: #FFFFFF;
  }
  strong {
    color: #C49A55;
  }
  code {
    background: #111A16;
    color: #8ED8BA;
    padding: 2px 6px;
    border-radius: 4px;
  }
---

# LocalLens
### Community-Based Civic Issue Reporting & Management Platform

**TalentSprint Full-Stack Web Development Review — Nov 2026**
*Full Stack Developer with AI − FSDAI - 1 Cohort*

**By:** Gopal Ainapurapu • Paavan Thota • Sri Charan Sangem  
**Stack:** React 19 • Express 5 • MongoDB • Leaflet GPS • Socket.IO • Recharts

---

## 1. Problem Statement & Real-World Challenges

### The Civic Infrastructure Crisis
- **Frequent Public Hazards**: Open potholes, sewage leaks, uncleared garbage, and dark street stretches cause daily accidents and health risks.
- **The "Black Box" Complaint Portal**: Conventional portals give citizens zero transparency on whether anyone reviewed or acted upon their complaints.
- **Unverifiable Paper Resolutions**: Grievances are frequently closed arbitrarily without on-site physical inspection or photographic evidence.
- **Blind Volunteer & Workforce Dispatch**: Municipalities lack visibility into volunteer locations, skills, availability, and exact coordinates.

---

## 2. Project Objectives & Proposed Solution

1. **Citizen Empowerment & Transparency**
   - Interactive Leaflet GPS map pin-drop & HTML5 auto-detect.
   - Live 5-stage progress stepper with append-only audit trail.
   - One-click issue sharing via Web Share API and clipboard copy.
2. **Admin Command & Smart Geospatial Dispatch**
   - Verification queue to validate genuine issues & reject spam with written notes.
   - Intelligent nearby volunteer recruitment with radius filtering.
   - Real-time Recharts analytics (status doughnut, category breakdown).
   - Municipal CSV compliance export.
3. **Field Volunteer Hub & Private Team Workspaces**
   - Available community tasks board with live distance in km.
   - Assignment request submission and team invitation responses.
   - Dedicated private workspaces with real-time Socket.IO chat.

---

## 3. Technology Stack & Database Architecture

| Layer | Technologies & Purpose |
| :--- | :--- |
| **Frontend Layer** | React 19.2.8, Vite 8.3.4, React Router v7, Leaflet 1.9, Recharts 3.10 |
| **Backend Layer** | Node.js LTS, Express 5.3.0, Socket.IO 4.8.4, Helmet 8.3, Multer 2.4 |
| **Database Layer** | MongoDB Atlas 7.0+, Mongoose 9.11, GeoJSON 2dsphere indexing |
| **Security Layer** | JWT (jsonwebtoken 9.0), bcryptjs (12 rounds), express-rate-limit 8.7 |

### Core Database Schemas
- `User`: GeoJSON Point, categories, skills, availability, rating.
- `Report`: 5-stage status, priority, 2dsphere coordinates, checklist, evidence.
- `VolunteerRequest`: Expressions of interest on open tasks with distance.
- `TeamInvitation`: Targeted invites with unique `{ report, volunteer }` index.
- `TeamMessage`: Dedicated private chat history per report team.
- `Notification`: Persistent in-app notifications with unread badge counter.

---

## 4. Multi-Tier Architecture & Data Flow

```
[Presentation Layer] React 19 SPA + Leaflet Maps + Socket.IO Client
         │
         ▼
[Gateway & Security Layer] Helmet + CORS + Express Rate Limit + JWT Auth
         │
         ▼
[Business Logic Layer] Report, Team, User Controllers + Scoped Sockets
         │
         ▼
[Persistence Layer] MongoDB Atlas (2dsphere) + Cloudinary CDN
```

### Synchronous Event & Audit Pipeline
Every status transition writes an immutable `statusHistory` entry, logs the actor's ID and timestamp, creates a `Notification` document, and dispatches a WebSocket event to the recipient's room.

---

## 5. Civic Issue Lifecycle & State Machine

```
[PENDING]  ─── Admin Verifies ───►  [VERIFIED]
    │                                    │
    ▼ Admin Rejects                      ▼ Admin / Team Dispatches
[REJECTED]                          [ASSIGNED]
                                         │
                                         ▼ Volunteer Arrives On Site
                                    [IN PROGRESS]
                                         │
                                         ▼ Submits Resolution Notes & Proof
                                    [RESOLVED]
```

### Strict Business Rules
- **No Direct Jump to Resolved**: Volunteers cannot skip from Assigned to Resolved without first marking In-Progress upon physical site arrival.
- **Mandatory Evidence**: Work descriptions and resolution notes are required.
- **Atomic Team Capacity**: Server enforces maximum team size (e.g. 5 members).

---

## 6. Smart Team Recruitment & Private Workspaces

### Smart Nearby Volunteer Recruitment
- Coordinator configures team size (e.g. 5 members), search radius (e.g. 15 km), and meeting instructions.
- MongoDB 2dsphere proximity query finds available volunteers ranked by distance in km, ratings, and skills.
- Targeted invitations are dispatched with real-time Socket.IO notifications.

### Dedicated Private Team Workspace (`/reports/:id/workspace`)
- **Scoped Socket.IO Chat**: Dedicated room `team:REPORT_ID` verified with JWT.
- **Coordination Checklist**: Subtasks with progress bar and completion checkboxes.
- **Dispatch Logistics**: Meeting point location, scheduled time, coordinator notes.
- **Evidence Review**: Evidence submission form and coordinator review panel.

---

## 7. Quality Assurance & 100% Verified Testing Results

- **Client ESLint**: 0 errors, 0 warnings (`npm --prefix client run lint`)
- **Client Vite Production Build**: Built in 691ms (`npm --prefix client run build`)
- **Server Syntax Verification**: Clean across all routes and models (`node --check`)
- **Database Seeding**: 8 demo users & 8 geo-tagged community reports seeded

### Automated Test Suite Results
| Test Scenario | Verification Objective | Result |
| :--- | :--- | :--- |
| **Direct Authentication** | Register and login directly without OTP | **✔ PASS** |
| **Direct Password Reset** | Reset password with registered email | **✔ PASS** |
| **Citizen Report Creation** | GeoJSON Point coordinates & priority tags | **✔ PASS** |
| **Team Capacity Enforcement**| 3rd member join attempt on 2-member team rejected | **✔ PASS** |
| **Private Team Space Security**| Confirmed members authorized; unrelated denied | **✔ PASS** |

---

## 8. CLI Execution Commands

### Setup & Development
```bash
# Start Backend Server (Port 5001)
cd server && npm run dev

# Start Frontend Client (Port 5173)
cd client && npm run dev
```

### Database Seeding & Verification
```bash
# Seed realistic demo users & reports
npm --prefix server run seed

# Run automated integration tests
npm --prefix server test
node server/scripts/testAuthAndTeam.js

# Production lint & build checks
npm --prefix client run lint
npm --prefix client run build
```

---

## 9. Seeded Demo Accounts Directory

> **Universal Password for all accounts**: `Password123!`

| Role | Name | Email Address | Coordinates / Location | Focus Area |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | System Admin | `admin@locallens.test` | Central HQ | Command, dispatch, CSV export |
| **Volunteer** | Rahul Sharma | `volunteer.rahul@locallens.test` | Indiranagar `[77.6408, 12.9784]` | Roads, streetlights, asphalt |
| **Volunteer** | Priya Patel | `volunteer.priya@locallens.test` | Jayanagar `[77.5834, 12.9304]` | Drainage jetting, water leaks |
| **Volunteer** | Arjun Das | `volunteer.arjun@locallens.test` | Central `[77.6105, 12.9716]` | Logistics, safety, first aid |
| **Volunteer** | Sneha Rao | `volunteer.sneha@locallens.test` | Koramangala `[77.6200, 12.9350]` | Waste management, sanitation |
| **Volunteer** | Kavita Nair | `volunteer.kavita@locallens.test` | HSR Layout `[77.6350, 12.9100]` | Heavy equipment, transport |
| **Citizen** | Anita Roy | `citizen.anita@locallens.test` | Central Ward | Community reporting |
| **Citizen** | Vikram Mehta | `citizen.vikram@locallens.test` | South Ward | Community reporting |

---

## 10. Team Roles & Project Conclusion

### Project Engineering Team
- **Gopal Ainapurapu**: Full-Stack & Database Engineering (MongoDB schemas, 2dsphere indexes, aggregation pipelines, team recruitment backend).
- **Paavan Thota**: Architecture, Security & Sockets (JWT, Socket.IO private rooms, bcrypt password recovery, rate-limiting, test suite).
- **Sri Charan Sangem**: Frontend UI/UX & Geospatial Mapping (React 19 SPA, Leaflet click-to-pin, Recharts analytics, Team Workspace UI).

### Conclusion
**LocalLens** proves that a modern, open civic tech platform can eliminate municipal communication bottlenecks, enforce verifiable audit accountability, and empower volunteers and city administrators to coordinate and resolve civic hazards in real-time.

---

# Thank You!
### LocalLens: Community-Based Civic Issue Reporting System
*TalentSprint Full-Stack Web Development Review*
