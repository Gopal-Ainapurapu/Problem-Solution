import PptxGenJS from 'pptxgenjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createPresentation() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  // Palette Constants
  const BG = '141C18';
  const CARD_BG = '1C2621';
  const ACCENT_GOLD = 'C49A55';
  const TEXT_WHITE = 'FFFFFF';
  const TEXT_LIGHT = 'E6EAE7';
  const TEXT_MUTED = '9BA5A0';
  const GREEN_ACCENT = '2E7D5B';
  const RED_ACCENT = 'C24747';

  // Helper for slide base styling
  function addBaseSlide(title, subtitle) {
    const slide = pptx.addSlide();
    slide.background = { color: BG };

    // Header banner
    slide.addText(
      [
        { text: 'LocalLens ', options: { bold: true, color: ACCENT_GOLD } },
        { text: '• TalentSprint FSDAI-1 Review', options: { color: TEXT_MUTED } },
      ],
      { x: 0.8, y: 0.35, fontSize: 10, fontFace: 'Calibri' }
    );

    slide.addText(title, {
      x: 0.8,
      y: 0.65,
      w: 11.5,
      h: 0.55,
      fontSize: 22,
      fontFace: 'Arial',
      bold: true,
      color: TEXT_WHITE,
    });

    if (subtitle) {
      slide.addText(subtitle, {
        x: 0.8,
        y: 1.15,
        w: 11.5,
        h: 0.3,
        fontSize: 12,
        fontFace: 'Calibri',
        color: ACCENT_GOLD,
      });
    }

    return slide;
  }

  // ==========================================
  // SLIDE 1: TITLE SLIDE
  // ==========================================
  const slide1 = pptx.addSlide();
  slide1.background = { color: BG };

  // Cohort pill badge
  slide1.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.8,
    y: 1.0,
    w: 5.8,
    h: 0.42,
    fill: { color: '24352D' },
    line: { color: ACCENT_GOLD, width: 1 },
    rectRadius: 0.2,
  });
  slide1.addText('★ TALENTSPRINT FULL-STACK WEB DEVELOPMENT REVIEW', {
    x: 0.9,
    y: 1.05,
    w: 5.6,
    h: 0.3,
    fontSize: 9.5,
    fontFace: 'Arial',
    bold: true,
    color: ACCENT_GOLD,
  });

  slide1.addText('LocalLens.', {
    x: 0.8,
    y: 1.6,
    w: 11.5,
    h: 1.1,
    fontSize: 48,
    fontFace: 'Arial',
    bold: true,
    color: TEXT_WHITE,
  });

  slide1.addText(
    'Community-Based Civic Issue Reporting & Management System',
    {
      x: 0.8,
      y: 2.7,
      w: 11.5,
      h: 0.5,
      fontSize: 20,
      fontFace: 'Arial',
      bold: true,
      color: '8ED8BA',
    }
  );

  // Description Card
  slide1.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8,
    y: 3.4,
    w: 11.7,
    h: 1.5,
    fill: { color: CARD_BG },
    line: { color: ACCENT_GOLD, width: 1.5 },
  });
  slide1.addText(
    'A production-grade MERN platform connecting Citizens, Municipal Administrators, and Field Volunteers to report, verify, assign, and resolve local public infrastructure problems with verified proof, 5-stage audit logging, and private team collaboration workspaces.',
    {
      x: 1.1,
      y: 3.65,
      w: 11.1,
      h: 1.0,
      fontSize: 13.5,
      fontFace: 'Calibri',
      color: TEXT_LIGHT,
      lineSpacing: 22,
    }
  );

  slide1.addText(
    'By: Gopal Ainapurapu • Paavan Thota • Sri Charan Sangem   |   Cohort: FSDAI-1   |   Nov 2026\nArchitecture: React 19 • Node.js Express 5 • MongoDB Mongoose • Leaflet GPS • Socket.IO • Recharts',
    {
      x: 0.8,
      y: 5.3,
      w: 11.7,
      h: 0.9,
      fontSize: 11,
      fontFace: 'Calibri',
      color: TEXT_MUTED,
    }
  );

  // ==========================================
  // SLIDE 2: PROBLEM STATEMENT & OBJECTIVES
  // ==========================================
  const slide2 = addBaseSlide(
    'Problem Statement & Project Objectives',
    'Real-World Civic Challenges & Proposed Solution Pillars'
  );

  // Left Box: Challenges
  slide2.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8,
    y: 1.6,
    w: 5.6,
    h: 4.8,
    fill: { color: CARD_BG },
    line: { color: '3A2424', width: 1 },
  });
  slide2.addText('⚠️ Real-World Civic Challenges', {
    x: 1.0,
    y: 1.8,
    w: 5.2,
    h: 0.4,
    fontSize: 14,
    fontFace: 'Arial',
    bold: true,
    color: RED_ACCENT,
  });
  slide2.addText(
    [
      { text: '• Frequent Public Hazards:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Open potholes, sewage overflows, uncleared waste, and unlit roads pose health & safety risks.\n\n', options: { color: TEXT_LIGHT } },
      { text: '• The "Black Box" Portal:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Citizens receive zero visibility into whether their grievances were viewed or assigned.\n\n', options: { color: TEXT_LIGHT } },
      { text: '• No Verifiable Audit Proof:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Issues are closed on paper without physical inspection or completion proof.\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Blind Volunteer Dispatch:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Lack of real-time visibility into volunteer skills, locations, and coordinates.', options: { color: TEXT_LIGHT } },
    ],
    { x: 1.0, y: 2.3, w: 5.2, h: 3.8, fontSize: 10.5, fontFace: 'Calibri' }
  );

  // Right Box: Solutions
  slide2.addShape(pptx.shapes.RECTANGLE, {
    x: 6.8,
    y: 1.6,
    w: 5.7,
    h: 4.8,
    fill: { color: CARD_BG },
    line: { color: '243A2C', width: 1 },
  });
  slide2.addText('🎯 Proposed Solution Pillars', {
    x: 7.0,
    y: 1.8,
    w: 5.3,
    h: 0.4,
    fontSize: 14,
    fontFace: 'Arial',
    bold: true,
    color: '8ED8BA',
  });
  slide2.addText(
    [
      { text: '1. Citizen Empowerment\n', options: { bold: true, color: ACCENT_GOLD } },
      { text: 'Interactive Leaflet GPS map pin-drop, live 5-stage stepper, and one-click issue sharing.\n\n', options: { color: TEXT_LIGHT } },
      { text: '2. Admin Command & Smart Dispatch\n', options: { bold: true, color: ACCENT_GOLD } },
      { text: 'Verification triage queue, proximity-based volunteer scanning, and Recharts visual analytics.\n\n', options: { color: TEXT_LIGHT } },
      { text: '3. Field Volunteer Hub & Workspaces\n', options: { bold: true, color: ACCENT_GOLD } },
      { text: 'Available tasks discovery, assignment requests, team invitations, and dedicated private workspaces with Socket.IO.', options: { color: TEXT_LIGHT } },
    ],
    { x: 7.0, y: 2.3, w: 5.3, h: 3.8, fontSize: 11, fontFace: 'Calibri' }
  );

  // ==========================================
  // SLIDE 3: TECH STACK & DATABASE ARCHITECTURE
  // ==========================================
  const slide3 = addBaseSlide(
    'Technology Stack & Database Architecture',
    'Production MERN Implementation with 2dsphere Geospatial Indexing'
  );

  // 3 Columns: Frontend, Backend, Database
  const colW = 3.65;
  const colH = 4.8;

  // Col 1: Frontend
  slide3.addShape(pptx.shapes.RECTANGLE, { x: 0.8, y: 1.6, w: colW, h: colH, fill: { color: CARD_BG } });
  slide3.addText('Frontend Architecture', { x: 1.0, y: 1.8, w: 3.25, h: 0.35, fontSize: 13, bold: true, color: ACCENT_GOLD });
  slide3.addText(
    [
      { text: '• React 19.2.8:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Concurrent rendering, modern hooks, AuthContext.\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Leaflet & React-Leaflet 5.0:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'OSM map rendering, click-to-pin, reverse geocoding.\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Recharts 3.10.1:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Responsive analytics charts (bars, doughnut).\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Socket.IO Client:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Real-time push notifications & private chat.', options: { color: TEXT_LIGHT } },
    ],
    { x: 1.0, y: 2.25, w: 3.25, h: 3.9, fontSize: 10, fontFace: 'Calibri' }
  );

  // Col 2: Backend
  slide3.addShape(pptx.shapes.RECTANGLE, { x: 4.8, y: 1.6, w: colW, h: colH, fill: { color: CARD_BG } });
  slide3.addText('Backend & Security', { x: 5.0, y: 1.8, w: 3.25, h: 0.35, fontSize: 13, bold: true, color: ACCENT_GOLD });
  slide3.addText(
    [
      { text: '• Express 5.3.0 & Node.js:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Modular REST routing, clean middleware pipeline.\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Socket.IO 4.8.4 Server:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Scoped user rooms & team:ID chat rooms.\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Authentication Engine:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'JWT bearer tokens, bcryptjs (12 rounds).\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Security Hardening:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Helmet headers, CORS policies, express-rate-limit.', options: { color: TEXT_LIGHT } },
    ],
    { x: 5.0, y: 2.25, w: 3.25, h: 3.9, fontSize: 10, fontFace: 'Calibri' }
  );

  // Col 3: MongoDB
  slide3.addShape(pptx.shapes.RECTANGLE, { x: 8.8, y: 1.6, w: colW, h: colH, fill: { color: CARD_BG } });
  slide3.addText('MongoDB Schemas', { x: 9.0, y: 1.8, w: 3.25, h: 0.35, fontSize: 13, bold: true, color: ACCENT_GOLD });
  slide3.addText(
    [
      { text: '• User:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: '2dsphere coordinates, role, skills, availability.\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Report:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'GeoJSON Point, priority, team size, checklist.\n\n', options: { color: TEXT_LIGHT } },
      { text: '• VolunteerRequest:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Task expressions of interest, distance in km.\n\n', options: { color: TEXT_LIGHT } },
      { text: '• TeamInvitation & TeamMessage:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Proximity invites and private team chat logs.', options: { color: TEXT_LIGHT } },
    ],
    { x: 9.0, y: 2.25, w: 3.25, h: 3.9, fontSize: 10, fontFace: 'Calibri' }
  );

  // ==========================================
  // SLIDE 4: ARCHITECTURE & DATA FLOW
  // ==========================================
  const slide4 = addBaseSlide(
    'Multi-Tier Architecture & End-to-End Data Flow',
    'Synchronous Audit Logging & Bi-Directional Event Dispatch'
  );

  // 4 Horizontal boxes
  const tiers = [
    { title: '1. Presentation Layer', desc: 'React 19 SPA, Vite bundler, Leaflet GPS mapping, Socket.io client listener.', color: '287A52' },
    { title: '2. Gateway & Security', desc: 'Express 5 on port 5001, Helmet security headers, CORS origin checks, Rate-Limiting.', color: '3B82F6' },
    { title: '3. Business Controllers', desc: 'Reports, Team Formation, Direct Auth, Scoped Socket.IO Rooms (user:ID & team:ID).', color: 'EAB308' },
    { title: '4. Persistence Layer', desc: 'MongoDB Atlas with 2dsphere indexes, Mongoose schemas, Cloudinary evidence CDN.', color: 'A855F7' },
  ];

  tiers.forEach((t, i) => {
    slide4.addShape(pptx.shapes.RECTANGLE, {
      x: 0.8 + i * 2.95,
      y: 1.6,
      w: 2.8,
      h: 2.6,
      fill: { color: CARD_BG },
      line: { color: t.color, width: 2 },
    });
    slide4.addText(t.title, {
      x: 0.95 + i * 2.95,
      y: 1.8,
      w: 2.5,
      h: 0.4,
      fontSize: 12,
      fontFace: 'Arial',
      bold: true,
      color: TEXT_WHITE,
    });
    slide4.addText(t.desc, {
      x: 0.95 + i * 2.95,
      y: 2.25,
      w: 2.5,
      h: 1.8,
      fontSize: 10.5,
      fontFace: 'Calibri',
      color: TEXT_LIGHT,
    });
  });

  // Bottom Callout
  slide4.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8,
    y: 4.5,
    w: 11.65,
    h: 1.9,
    fill: { color: CARD_BG },
    line: { color: ACCENT_GOLD, width: 1 },
  });
  slide4.addText('Synchronous Audit & Notification Pipeline', {
    x: 1.0,
    y: 4.7,
    w: 11.2,
    h: 0.35,
    fontSize: 13,
    bold: true,
    color: ACCENT_GOLD,
  });
  slide4.addText(
    'Every report state transition synchronously appends an immutable entry to statusHistory, recording the actor ID, role, and context note. Simultaneously, a persistent Notification document is saved to MongoDB and pushed in real-time over Socket.IO to the user’s personal device room, incrementing their unread badge instantly.',
    {
      x: 1.0,
      y: 5.1,
      w: 11.2,
      h: 1.1,
      fontSize: 11.5,
      fontFace: 'Calibri',
      color: TEXT_LIGHT,
      lineSpacing: 18,
    }
  );

  // ==========================================
  // SLIDE 5: CIVIC ISSUE LIFECYCLE
  // ==========================================
  const slide5 = addBaseSlide(
    'Civic Issue Lifecycle & State Machine',
    'Strict Role-Bound Transitions and Verification Gates'
  );

  // 5 Step Chevrons
  const steps = [
    { num: 'Stage 1', name: 'PENDING', desc: 'Citizen submits with GPS coordinates and images.' },
    { num: 'Stage 2', name: 'VERIFIED', desc: 'Admin validates authenticity; rejects spam with note.' },
    { num: 'Stage 3', name: 'ASSIGNED', desc: 'Dispatched to volunteer or multi-member team.' },
    { num: 'Stage 4', name: 'IN PROGRESS', desc: 'Volunteer marks on site; active work begins.' },
    { num: 'Stage 5', name: 'RESOLVED', desc: 'Mandatory resolution notes & proof photos submitted.' },
  ];

  steps.forEach((s, idx) => {
    slide5.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.8 + idx * 2.35,
      y: 1.6,
      w: 2.25,
      h: 2.2,
      fill: { color: CARD_BG },
      line: { color: ACCENT_GOLD, width: 1 },
      rectRadius: 0.1,
    });
    slide5.addText(s.num, {
      x: 0.9 + idx * 2.35,
      y: 1.75,
      w: 2.05,
      h: 0.25,
      fontSize: 9.5,
      color: ACCENT_GOLD,
      bold: true,
      align: 'center',
    });
    slide5.addText(s.name, {
      x: 0.9 + idx * 2.35,
      y: 2.05,
      w: 2.05,
      h: 0.35,
      fontSize: 13,
      fontFace: 'Arial',
      color: TEXT_WHITE,
      bold: true,
      align: 'center',
    });
    slide5.addText(s.desc, {
      x: 0.95 + idx * 2.35,
      y: 2.45,
      w: 1.95,
      h: 1.2,
      fontSize: 10,
      fontFace: 'Calibri',
      color: TEXT_LIGHT,
      align: 'center',
    });
  });

  // Business Rules Box
  slide5.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8,
    y: 4.1,
    w: 11.65,
    h: 2.3,
    fill: { color: CARD_BG },
    line: { color: '24352D', width: 1 },
  });
  slide5.addText('Enforced Business Rules & Integrity Constraints', {
    x: 1.0,
    y: 4.25,
    w: 11.2,
    h: 0.3,
    fontSize: 12.5,
    bold: true,
    color: ACCENT_GOLD,
  });
  slide5.addText(
    [
      { text: '1. No Direct Jump to Resolved: ', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Volunteers cannot skip from Assigned directly to Resolved without first marking In-Progress upon physical site arrival.\n', options: { color: TEXT_LIGHT } },
      { text: '2. Mandatory Evidence Proof: ', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Resolving an issue requires non-empty resolution notes detailing actions taken and optional completion photos.\n', options: { color: TEXT_LIGHT } },
      { text: '3. Terminal Rejection Protocol: ', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Admins can reject Pending/Verified issues with a mandatory reason. Once resolved, reports cannot be rejected.\n', options: { color: TEXT_LIGHT } },
      { text: '4. Immutable Audit Trail: ', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Every state change writes an append-only audit entry. History cannot be modified or cleared.', options: { color: TEXT_LIGHT } },
    ],
    { x: 1.0, y: 4.6, w: 11.2, h: 1.6, fontSize: 10.5, fontFace: 'Calibri' }
  );

  // ==========================================
  // SLIDE 6: CORE PORTALS & ROLE DASHBOARDS
  // ==========================================
  const slide6 = addBaseSlide(
    'Citizen, Volunteer & Administrator Portals',
    'Customized Interfaces Tailored to Each Stakeholder Persona'
  );

  const portals = [
    {
      title: 'Citizen Portal',
      icon: '👤',
      items: [
        'Interactive Leaflet click-to-pin map',
        'Reverse geocoding to street address',
        'Priority tagging (Urgent, High, Medium, Low)',
        'Cards view & fullscreen community map',
        'One-click native share & clipboard link',
        'Personal dashboard with 5-stage stepper',
      ],
      color: '2E7D5B',
    },
    {
      title: 'Volunteer Hub',
      icon: '🛠️',
      items: [
        'Live availability switch (Available / Paused)',
        'Available Tasks board with distance in km',
        '1-click assignment requests with notes',
        'Accept / Decline team invitations',
        'Dedicated team workspaces with chat',
        'Direct resolution submission with proof',
      ],
      color: '3B82F6',
    },
    {
      title: 'Admin Command',
      icon: '👑',
      items: [
        'Verification queue to filter fake reports',
        'Nearby volunteer discovery with radius',
        'Multi-member team dispatch (e.g. 5 members)',
        'Recharts analytics (category, status, SLA)',
        'Municipal CSV compliance export',
        'Resolution approval & evidence audit',
      ],
      color: 'C49A55',
    },
  ];

  portals.forEach((p, idx) => {
    slide6.addShape(pptx.shapes.RECTANGLE, {
      x: 0.8 + idx * 3.95,
      y: 1.6,
      w: 3.75,
      h: 4.8,
      fill: { color: CARD_BG },
      line: { color: p.color, width: 1.5 },
    });
    slide6.addText(`${p.icon} ${p.title}`, {
      x: 1.0 + idx * 3.95,
      y: 1.8,
      w: 3.35,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: TEXT_WHITE,
    });
    const bulletList = p.items.map((it) => ({ text: `• ${it}\n\n`, options: { color: TEXT_LIGHT } }));
    slide6.addText(bulletList, {
      x: 1.0 + idx * 3.95,
      y: 2.3,
      w: 3.35,
      h: 3.9,
      fontSize: 10.5,
      fontFace: 'Calibri',
    });
  });

  // ==========================================
  // SLIDE 7: SMART RECRUITMENT & TEAM WORKSPACE
  // ==========================================
  const slide7 = addBaseSlide(
    'Smart Team Formation & Private Group Workspaces',
    'Geospatial Proximity Dispatch and Scoped Socket.IO Collaboration'
  );

  slide7.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8,
    y: 1.6,
    w: 5.6,
    h: 4.8,
    fill: { color: CARD_BG },
    line: { color: ACCENT_GOLD, width: 1 },
  });
  slide7.addText('👥 Smart Nearby Volunteer Recruitment', {
    x: 1.0,
    y: 1.8,
    w: 5.2,
    h: 0.4,
    fontSize: 13.5,
    bold: true,
    color: ACCENT_GOLD,
  });
  slide7.addText(
    [
      { text: '• Configurable Team Capacity:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Coordinators set team size (e.g. 5 members) and recruitment radius (e.g. 15 km).\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Geospatial Proximity Scan:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'MongoDB calculates real-time distance in km to available nearby volunteers.\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Targeted Invitations:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Push alerts notify candidates; volunteers explicitly accept or decline.\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Atomic Capacity Enforcement:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Server atomically blocks any 6th member from joining a 5-member team.', options: { color: TEXT_LIGHT } },
    ],
    { x: 1.0, y: 2.3, w: 5.2, h: 3.8, fontSize: 10.5, fontFace: 'Calibri' }
  );

  slide7.addShape(pptx.shapes.RECTANGLE, {
    x: 6.8,
    y: 1.6,
    w: 5.7,
    h: 4.8,
    fill: { color: CARD_BG },
    line: { color: '2E7D5B', width: 1 },
  });
  slide7.addText('💬 Dedicated Private Team Workspace', {
    x: 7.0,
    y: 1.8,
    w: 5.3,
    h: 0.4,
    fontSize: 13.5,
    bold: true,
    color: '8ED8BA',
  });
  slide7.addText(
    [
      { text: '• Scoped Socket.IO Real-Time Chat:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Dedicated room team:REPORT_ID authenticated with JWT token on connection.\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Strict Privacy Guarantee:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Only confirmed team members and coordinator can enter. Unrelated users are denied.\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Coordination Subtask Checklist:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Shared task items with checkboxes and live completion percentage bar.\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Dispatch Logistics & Review:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Meeting point, schedule, and evidence submission with coordinator approval.', options: { color: TEXT_LIGHT } },
    ],
    { x: 7.0, y: 2.3, w: 5.3, h: 3.8, fontSize: 10.5, fontFace: 'Calibri' }
  );

  // ==========================================
  // SLIDE 8: TESTING & QUALITY ASSURANCE
  // ==========================================
  const slide8 = addBaseSlide(
    'Testing Methodology & 100% Verified Results',
    'Comprehensive Test Suite and Production Verification Metrics'
  );

  // Top metric pills
  const metrics = [
    { label: 'Client ESLint', val: '0 Errors, 0 Warnings' },
    { label: 'Client Vite Build', val: 'Built in 691 ms' },
    { label: 'Server Syntax Check', val: 'Clean (node --check)' },
  ];
  metrics.forEach((m, idx) => {
    slide8.addShape(pptx.shapes.RECTANGLE, {
      x: 0.8 + idx * 3.95,
      y: 1.6,
      w: 3.75,
      h: 0.9,
      fill: { color: CARD_BG },
      line: { color: '2E7D5B', width: 1 },
    });
    slide8.addText(m.label, { x: 1.0 + idx * 3.95, y: 1.7, w: 3.35, h: 0.25, fontSize: 9.5, color: TEXT_MUTED });
    slide8.addText(m.val, { x: 1.0 + idx * 3.95, y: 1.95, w: 3.35, h: 0.4, fontSize: 13, bold: true, color: '8ED8BA' });
  });

  // Test Results Table
  const testTableRows = [
    [
      { text: 'Test Scenario', options: { bold: true, fill: '24352D', color: ACCENT_GOLD } },
      { text: 'Verification Target', options: { bold: true, fill: '24352D', color: ACCENT_GOLD } },
      { text: 'Result', options: { bold: true, fill: '24352D', color: ACCENT_GOLD } },
    ],
    [
      { text: 'Direct Authentication', options: { color: TEXT_WHITE } },
      { text: 'Registration & login create user and issue JWT without OTP requirement', options: { color: TEXT_LIGHT } },
      { text: '✔ PASS', options: { bold: true, color: '8ED8BA' } },
    ],
    [
      { text: 'Direct Password Reset', options: { color: TEXT_WHITE } },
      { text: 'Accepts email and newPassword, hashes with bcryptjs, increments tokenVersion', options: { color: TEXT_LIGHT } },
      { text: '✔ PASS', options: { bold: true, color: '8ED8BA' } },
    ],
    [
      { text: 'Citizen Report Creation', options: { color: TEXT_WHITE } },
      { text: 'POST /api/reports stores GeoJSON coordinates and priority flags', options: { color: TEXT_LIGHT } },
      { text: '✔ PASS', options: { bold: true, color: '8ED8BA' } },
    ],
    [
      { text: 'Team Capacity Limit', options: { color: TEXT_WHITE } },
      { text: 'Configured capacity of 2; 3rd volunteer join attempt is atomically rejected', options: { color: TEXT_LIGHT } },
      { text: '✔ PASS', options: { bold: true, color: '8ED8BA' } },
    ],
    [
      { text: 'Private Team Space Security', options: { color: TEXT_WHITE } },
      { text: 'Confirmed members authorized; unrelated volunteer requests return 403 Forbidden', options: { color: TEXT_LIGHT } },
      { text: '✔ PASS', options: { bold: true, color: '8ED8BA' } },
    ],
  ];

  slide8.addTable(testTableRows, {
    x: 0.8,
    y: 2.7,
    w: 11.65,
    h: 3.6,
    colW: [2.8, 7.35, 1.5],
    fontSize: 10,
    fontFace: 'Calibri',
    border: { pt: 0.5, color: '2E3D35' },
    fill: CARD_BG,
  });

  // ==========================================
  // SLIDE 9: TEAM, COMMANDS & CONCLUSION
  // ==========================================
  const slide9 = addBaseSlide(
    'Team Roles, Execution Commands & Test Credentials',
    'FSDAI-1 Cohort Engineering Review & Universal Demo Access'
  );

  // Left Box: Team & Credentials
  slide9.addShape(pptx.shapes.RECTANGLE, {
    x: 0.8,
    y: 1.6,
    w: 5.6,
    h: 4.8,
    fill: { color: CARD_BG },
    line: { color: ACCENT_GOLD, width: 1 },
  });
  slide9.addText('🔑 Seeded Accounts (Password: Password123!)', {
    x: 1.0,
    y: 1.8,
    w: 5.2,
    h: 0.35,
    fontSize: 13,
    bold: true,
    color: ACCENT_GOLD,
  });
  slide9.addText(
    [
      { text: '• Administrator: ', options: { bold: true, color: TEXT_WHITE } },
      { text: 'admin@locallens.test (Full control & CSV export)\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Volunteer (Rahul): ', options: { bold: true, color: TEXT_WHITE } },
      { text: 'volunteer.rahul@locallens.test (Roads, streetlights)\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Volunteer (Priya): ', options: { bold: true, color: TEXT_WHITE } },
      { text: 'volunteer.priya@locallens.test (Water leaks, drainage)\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Volunteer (Arjun): ', options: { bold: true, color: TEXT_WHITE } },
      { text: 'volunteer.arjun@locallens.test (Logistics, first aid)\n\n', options: { color: TEXT_LIGHT } },
      { text: '• Citizens (Anita & Vikram): ', options: { bold: true, color: TEXT_WHITE } },
      { text: 'citizen.anita@locallens.test & citizen.vikram@locallens.test', options: { color: TEXT_LIGHT } },
    ],
    { x: 1.0, y: 2.25, w: 5.2, h: 3.9, fontSize: 10, fontFace: 'Calibri' }
  );

  // Right Box: Commands & Roles
  slide9.addShape(pptx.shapes.RECTANGLE, {
    x: 6.8,
    y: 1.6,
    w: 5.7,
    h: 4.8,
    fill: { color: CARD_BG },
    line: { color: '24352D', width: 1 },
  });
  slide9.addText('💻 Commands & Team Roles', {
    x: 7.0,
    y: 1.8,
    w: 5.3,
    h: 0.35,
    fontSize: 13,
    bold: true,
    color: '8ED8BA',
  });
  slide9.addText(
    [
      { text: 'CLI Execution Commands:\n', options: { bold: true, color: ACCENT_GOLD } },
      { text: '• cd server && npm run dev (Backend on Port 5001)\n', options: { color: TEXT_LIGHT } },
      { text: '• cd client && npm run dev (Frontend on Port 5173)\n', options: { color: TEXT_LIGHT } },
      { text: '• npm --prefix server run seed (Seed 8 Users & Reports)\n', options: { color: TEXT_LIGHT } },
      { text: '• node server/scripts/testAuthAndTeam.js (Run Tests)\n\n', options: { color: TEXT_LIGHT } },
      { text: 'Project Engineering Team:\n', options: { bold: true, color: ACCENT_GOLD } },
      { text: '• Gopal Ainapurapu: Full-Stack & Database Engineering\n', options: { color: TEXT_LIGHT } },
      { text: '• Paavan Thota: Architecture, Security & Socket.IO\n', options: { color: TEXT_LIGHT } },
      { text: '• Sri Charan Sangem: Frontend UI/UX & Geospatial Mapping', options: { color: TEXT_LIGHT } },
    ],
    { x: 7.0, y: 2.25, w: 5.3, h: 3.9, fontSize: 10, fontFace: 'Calibri' }
  );

  const outputPath = path.resolve(__dirname, '../docs/LocalLens_Project_Presentation.pptx');
  await pptx.writeFile({ fileName: outputPath });
  console.log('✓ Successfully generated:', outputPath);
}

createPresentation().catch(console.error);
