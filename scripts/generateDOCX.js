import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
} from 'docx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createDocx() {
  const tableBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'D0D5DD' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D0D5DD' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'D0D5DD' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'D0D5DD' },
  };

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Document Header
          new Paragraph({
            text: 'LocalLens: Community-Based Civic Issue Reporting and Management System',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
          }),
          new Paragraph({
            text: 'Comprehensive Technical Documentation & Operational Architecture Manual',
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'TalentSprint Full-Stack Web Development Review • FSDAI - 1 Cohort\n', bold: true }),
              new TextRun({ text: 'Engineered By: Gopal Ainapurapu • Paavan Thota • Sri Charan Sangem\n', italics: true }),
              new TextRun({ text: 'Version: 2.4.0 (Production Verified) • November 2026\n', color: '667085' }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // 1. Executive Summary
          new Paragraph({
            text: '1. Executive Summary & Problem Statement',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 140 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Modern municipalities struggle with infrastructure maintenance due to lack of visibility, fragmented communication channels, and unverified paper closures. LocalLens addresses this by introducing a transparent, geospatial civic application connecting citizens, administrators, and field workers with an append-only audit trail and private team workspaces.',
              }),
            ],
            spacing: { after: 200 },
          }),

          // 2. Technology Stack Table
          new Paragraph({
            text: '2. Technology Stack & Architectural Specifications',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 140 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Layer', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Technology', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Version', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Architectural Function', bold: true })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Frontend')] }),
                  new TableCell({ children: [new Paragraph('React')] }),
                  new TableCell({ children: [new Paragraph('19.2.8')] }),
                  new TableCell({ children: [new Paragraph('Concurrent rendering, component hooks')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Tooling')] }),
                  new TableCell({ children: [new Paragraph('Vite')] }),
                  new TableCell({ children: [new Paragraph('8.3.4')] }),
                  new TableCell({ children: [new Paragraph('ES module bundling, HMR, production build')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Mapping')] }),
                  new TableCell({ children: [new Paragraph('Leaflet & React-Leaflet')] }),
                  new TableCell({ children: [new Paragraph('1.9.4 / 5.0')] }),
                  new TableCell({ children: [new Paragraph('OpenStreetMap, click-to-pin coordinate picker')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Analytics')] }),
                  new TableCell({ children: [new Paragraph('Recharts')] }),
                  new TableCell({ children: [new Paragraph('3.10.1')] }),
                  new TableCell({ children: [new Paragraph('Municipal analytics charts & distributions')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Backend API')] }),
                  new TableCell({ children: [new Paragraph('Node.js & Express')] }),
                  new TableCell({ children: [new Paragraph('5.3.0')] }),
                  new TableCell({ children: [new Paragraph('Modular REST architecture, auth middleware')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Database')] }),
                  new TableCell({ children: [new Paragraph('MongoDB Atlas & Mongoose')] }),
                  new TableCell({ children: [new Paragraph('9.11.1')] }),
                  new TableCell({ children: [new Paragraph('2dsphere geospatial indexing, audit schemas')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Real-Time')] }),
                  new TableCell({ children: [new Paragraph('Socket.IO')] }),
                  new TableCell({ children: [new Paragraph('4.8.4')] }),
                  new TableCell({ children: [new Paragraph('Real-time notifications & private team chat')] }),
                ],
              }),
            ],
          }),

          // 3. Civic Lifecycle
          new Paragraph({
            text: '3. Civic Issue Lifecycle & State Machine',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 140 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• Stage 1 (Pending): ', bold: true }),
              new TextRun('Citizen submits issue with GPS coordinates and images.\n'),
              new TextRun({ text: '• Stage 2 (Verified): ', bold: true }),
              new TextRun('Admin approves legitimate complaint; rejects spam with note.\n'),
              new TextRun({ text: '• Stage 3 (Assigned): ', bold: true }),
              new TextRun('Dispatched to skilled volunteer or multi-member team.\n'),
              new TextRun({ text: '• Stage 4 (In Progress): ', bold: true }),
              new TextRun('Volunteer marks arrival on site and starts work.\n'),
              new TextRun({ text: '• Stage 5 (Resolved): ', bold: true }),
              new TextRun('Mandatory resolution notes and completion proof photos submitted.\n'),
            ],
            spacing: { after: 200 },
          }),

          // 4. Team Workspaces
          new Paragraph({
            text: '4. Dedicated Private Team Workspaces & Collaboration',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 140 },
          }),
          new Paragraph({
            children: [
              new TextRun(
                'When an issue requires a team (e.g. 5 volunteers for drainage or road clearance), LocalLens provisions a dedicated private team workspace at /reports/:id/workspace. Features include: (1) Scoped Socket.IO real-time chat restricted to confirmed members, (2) Subtask coordination checklist, (3) Meeting point logistics and scheduled time, and (4) Completion evidence review.'
              ),
            ],
            spacing: { after: 200 },
          }),

          // 5. Commands
          new Paragraph({
            text: '5. CLI Execution Commands',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 140 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Start Backend Server (Port 5001): ', bold: true }),
              new TextRun({ text: 'cd server && npm run dev\n', font: 'Consolas' }),
              new TextRun({ text: 'Start Frontend Client (Port 5173): ', bold: true }),
              new TextRun({ text: 'cd client && npm run dev\n', font: 'Consolas' }),
              new TextRun({ text: 'Seed Demo Data: ', bold: true }),
              new TextRun({ text: 'npm --prefix server run seed\n', font: 'Consolas' }),
              new TextRun({ text: 'Run Integration Tests: ', bold: true }),
              new TextRun({ text: 'node server/scripts/testAuthAndTeam.js\n', font: 'Consolas' }),
              new TextRun({ text: 'Run Client Lint & Build: ', bold: true }),
              new TextRun({ text: 'npm --prefix client run lint && npm --prefix client run build\n', font: 'Consolas' }),
            ],
            spacing: { after: 200 },
          }),

          // 6. Test Credentials Table
          new Paragraph({
            text: '6. Seeded Test Credentials (Password: Password123!)',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 140 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Role', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Name', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Email Address', bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Operational Specialty', bold: true })] })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Administrator')] }),
                  new TableCell({ children: [new Paragraph('System Admin')] }),
                  new TableCell({ children: [new Paragraph('admin@locallens.test')] }),
                  new TableCell({ children: [new Paragraph('Full command, verification, CSV export')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Volunteer')] }),
                  new TableCell({ children: [new Paragraph('Rahul Sharma')] }),
                  new TableCell({ children: [new Paragraph('volunteer.rahul@locallens.test')] }),
                  new TableCell({ children: [new Paragraph('Roads, streetlights, asphalt repair')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Volunteer')] }),
                  new TableCell({ children: [new Paragraph('Priya Patel')] }),
                  new TableCell({ children: [new Paragraph('volunteer.priya@locallens.test')] }),
                  new TableCell({ children: [new Paragraph('Water leaks, drainage jetting')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Volunteer')] }),
                  new TableCell({ children: [new Paragraph('Arjun Das')] }),
                  new TableCell({ children: [new Paragraph('volunteer.arjun@locallens.test')] }),
                  new TableCell({ children: [new Paragraph('Logistics, crowd safety, first aid')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Citizen')] }),
                  new TableCell({ children: [new Paragraph('Anita Roy')] }),
                  new TableCell({ children: [new Paragraph('citizen.anita@locallens.test')] }),
                  new TableCell({ children: [new Paragraph('Central Ward community reporter')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Citizen')] }),
                  new TableCell({ children: [new Paragraph('Vikram Mehta')] }),
                  new TableCell({ children: [new Paragraph('citizen.vikram@locallens.test')] }),
                  new TableCell({ children: [new Paragraph('South Ward resident reporter')] }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.resolve(__dirname, '../docs/LocalLens_Complete_Project_Documentation.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('✓ Successfully generated:', outPath);
}

createDocx().catch(console.error);
