# LocalLens: Community-Based Civic Issue Reporting and Management System
## Complete Production-Grade Technical Documentation & Architectural Reference

> **Project Cohort**: Full Stack Developer with AI − FSDAI - 1 Cohort  
> **Institution**: TalentSprint Full-Stack Web Development Review  
> **Engineered By**: Gopal Ainapurapu • Paavan Thota • Sri Charan Sangem  
> **Release Version**: 2.4.0 (Production Verified • November 2026)  
> **Primary Stack**: React 19 • Node.js Express 5 • MongoDB Mongoose • Leaflet GPS • Socket.IO • Recharts

---

## 1. Executive Summary & Problem Statement

### 1.1 The Real-World Civic Challenge
Modern municipalities and urban communities face severe logistical bottlenecks when addressing public infrastructure decay:
- **Frequent Public Hazards**: Citizens routinely encounter open potholes, hazardous sewage overflows, broken water mains, uncleared garbage bins, and unlit street stretches that cause traffic accidents, property damage, and severe public health risks.
- **The "Black Box" Portal Problem**: Conventional municipal grievance portals operate as opaque silos. Citizens submit complaints but receive zero transparency on whether their report was reviewed, who was assigned, or when field personnel will inspect the site.
- **Unverifiable Paper Resolutions**: Grievances are frequently closed prematurely without on-site physical inspection, photographic evidence, or audit logging.
- **Inefficient Volunteer & Workforce Dispatch**: Municipal staff lack real-time visibility into field volunteer availability, skills, active workloads, and exact geographic coordinates, leading to misallocated resources (e.g. dispatching general volunteers to high-voltage electrical hazards).

### 1.2 The LocalLens Solution
**LocalLens** is a modern, transparent civic engagement platform bridging the gap between **Citizens**, **Municipal Administrators**, and **Field Volunteers**. The system provides:
1. **Geospatial Precision**: Interactive Leaflet maps with HTML5 GPS pin-drop coordinate capture and reverse geocoding.
2. **Transparent 5-Stage Stepper**: Immutable, append-only audit trail tracking every civic report from `Pending` → `Verified` → `Assigned` → `In Progress` → `Resolved`.
3. **Smart Nearby Team Formation**: Automated geospatial scanning of eligible nearby volunteers based on distance, skill domain, and availability for large operations (e.g. 5-member disaster response teams).
4. **Dedicated Private Team Workspaces**: Scoped, authenticated private communication spaces per report with real-time Socket.IO chat, subtask checklists, dispatch logistics, and evidence review.
5. **Real-Time Push Notifications**: Instant bi-directional alerts for dispatch, assignment, invites, and status milestones.

---

## 2. Technology Stack & Architecture

### 2.1 Technology Stack Matrix

| Layer | Technology | Version | Purpose & Architectural Role |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **React** | `19.2.8` | Next-gen concurrent rendering, component state management, hooks |
| **Build & Tooling** | **Vite** | `8.3.4` | Ultra-fast HMR, ES modules bundling, production tree-shaking |
| **Routing** | **React Router DOM** | `7.18.4` | Declarative client-side routing, protected role-based routes |
| **Geospatial Mapping** | **Leaflet & React-Leaflet** | `1.9.4` / `5.0.0` | OpenStreetMap coordinate rendering, click-to-pin, heatmap |
| **Data Visualization** | **Recharts** | `3.10.1` | Interactive analytics charts (status doughnut, category bars, trends) |
| **Real-Time Engine** | **Socket.IO (Client & Server)** | `4.8.4` | Bi-directional WebSocket events, user rooms, private team chat |
| **HTTP Client** | **Axios** | `1.20.0` | Promise-based API requests with automatic JWT bearer interceptors |
| **Toast Alerts** | **react-hot-toast** | `2.6.1` | Non-blocking, accessible notifications and feedback toasts |
| **Backend Runtime** | **Node.js** | `>=20.19.0` (LTS) | Asynchronous, non-blocking event-driven JavaScript runtime |
| **API Framework** | **Express** | `5.3.0` | Modular RESTful routing, middleware pipeline, error handling |
| **Database Engine** | **MongoDB** | `7.0+` / Atlas | High-throughput document database with native 2dsphere indexing |
| **Object Modeling** | **Mongoose** | `9.11.1` | Schema validation, compound indexing, query hooks, virtuals |
| **Authentication** | **jsonwebtoken & bcryptjs** | `9.0.3` / `3.0.3` | Stateless Bearer JWT tokens, 12-round salted password hashing |
| **Security Middleware**| **Helmet & express-rate-limit** | `8.3.0` / `8.7.1`| HTTP headers hardening, anti-brute-force rate limiting |
| **File Management** | **Multer & Cloudinary** | `2.4.0` / `2.11.0`| Memory storage buffer upload, Cloudinary cloud image storage |

---

## 3. Database Schemas & Data Integrity Models

### 3.1 User Schema (`server/models/User.js`)
Stores citizens, field volunteers, and municipal administrators with location and operational metadata.

```javascript
{
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['citizen', 'volunteer', 'admin'], default: 'citizen' },
  phone: { type: String, trim: true },
  profileImage: { type: String },
  bio: { type: String, maxlength: 500 },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] } // [longitude, latitude]
  },
  serviceRadiusMeters: { type: Number, default: 5000 },
  categories: [{ type: String, lowercase: true }],
  skills: [{ type: String, lowercase: true }],
  isAvailable: { type: Boolean, default: false },
  activeTasks: { type: Number, default: 0 },
  completedTasks: { type: Number, default: 0 },
  rating: { type: Number, default: 5.0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  tokenVersion: { type: Number, default: 0, select: false }
}
```

### 3.2 Report Schema (`server/models/Report.js`)
Core document tracking community issues, geospatial coordinates, team formation, and completion evidence.

```javascript
{
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, minlength: 5, maxlength: 120 },
  description: { type: String, required: true, minlength: 10, maxlength: 3000 },
  category: {
    type: String,
    enum: ['garbage', 'roads', 'water', 'electricity', 'streetlight', 'drainage', 'public-safety', 'other'],
    required: true
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: {
    type: String,
    enum: ['pending', 'verified', 'assigned', 'in-progress', 'resolved', 'rejected'],
    default: 'pending'
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  address: { type: String, maxlength: 300 },
  images: [{ type: String, maxlength: 2048 }], // Up to 5 image URLs
  assignedVolunteer: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  
  // Team Collaboration & Recruitment Engine
  assignmentType: { type: String, enum: ['single', 'team'], default: 'single' },
  requiredTeamSize: { type: Number, min: 1, max: 50, default: 1 },
  teamCoordinator: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  teamMembers: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['lead', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  recruitmentStatus: { type: String, enum: ['none', 'open', 'full', 'closed', 'cancelled'], default: 'none' },
  recruitmentRadiusKm: { type: Number, default: 10, max: 100 },
  recruitmentDeadline: { type: Date, default: null },
  requiredSkills: [{ type: String, lowercase: true }],
  meetingDetails: {
    location: { type: String, default: '' },
    scheduledDate: { type: Date, default: null },
    instructions: { type: String, default: '' }
  },
  teamTasks: [{
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date, default: null }
  }],
  completionReport: {
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    submittedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
    images: [{ type: String }],
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewStatus: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
    reviewNotes: { type: String, default: '' }
  },
  statusHistory: [{
    status: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, default: '' },
    changedAt: { type: Date, default: Date.now }
  }]
}
```

---

## 4. Civic Issue Lifecycle & State Machine

1. **PENDING**: Citizen submits report with GPS pin and images.
2. **VERIFIED**: Admin reviews and authenticates the issue; invalid complaints are rejected with written justification.
3. **ASSIGNED**: Dispatched to an individual volunteer or a multi-volunteer team.
4. **IN PROGRESS**: Field worker arrives on site and activates "Start Work".
5. **RESOLVED**: Work completed; mandatory resolution notes and completion photos are submitted and approved.

---

## 5. Dedicated Private Team Workspaces (`/reports/:id/workspace`)

- **Scoped Real-Time Socket.IO Chat**: Dedicated room `team:${reportId}` verified with JWT.
- **Coordination Checklist**: Subtasks with progress percentage.
- **Logistics**: Meeting point, scheduled time, and instructions.
- **Roster**: Confirmed members with roles and contact info.
- **Evidence Review**: Evidence submission and coordinator approval workflow.

---

## 6. CLI Commands & Execution Guide

```bash
# Backend installation
cd server
npm install

# Frontend installation
cd ../client
npm install

# Seed realistic database
npm --prefix server run seed

# Run automated tests
npm --prefix server test
node server/scripts/testAuthAndTeam.js

# Start backend server (Port 5001)
npm --prefix server run dev

# Start frontend client (Port 5173)
npm --prefix client run dev

# Lint & build checks
npm --prefix client run lint
npm --prefix client run build
```

---

## 7. Seeded Test Credentials

> **Universal Password**: `Password123!`

| Role | Name | Email Address | Coordinates / Location | Focus Area |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | System Admin | `admin@locallens.test` | Central HQ | Verification, dispatch, team recruitment |
| **Field Volunteer** | Rahul Sharma | `volunteer.rahul@locallens.test` | Indiranagar `[77.6408, 12.9784]` | Roads, streetlights, asphalt repair |
| **Field Volunteer** | Priya Patel | `volunteer.priya@locallens.test` | Jayanagar `[77.5834, 12.9304]` | Water leaks, drainage, sanitation |
| **Field Volunteer** | Arjun Das | `volunteer.arjun@locallens.test` | Central `[77.6105, 12.9716]` | Logistics, safety, first aid |
| **Field Volunteer** | Sneha Rao | `volunteer.sneha@locallens.test` | Koramangala `[77.6200, 12.9350]` | Waste management, sanitation |
| **Field Volunteer** | Kavita Nair | `volunteer.kavita@locallens.test` | HSR Layout `[77.6350, 12.9100]` | Heavy equipment, transport |
| **Citizen** | Anita Roy | `citizen.anita@locallens.test` | Central Ward | Community reporting |
| **Citizen** | Vikram Mehta | `citizen.vikram@locallens.test` | South Ward | Community reporting |
