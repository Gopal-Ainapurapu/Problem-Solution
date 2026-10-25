import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Report from '../models/Report.js';
import Notification from '../models/Notification.js';

const DEMO_PASSWORD = 'Password123!';

async function seedDatabase() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing in server/.env');
    }

    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    // 1. Seed or update Users
    console.log('Seeding demo users...');
    const usersData = [
      {
        name: 'System Admin',
        email: 'admin@locallens.test',
        role: 'admin',
        bio: 'City civic administrator overseeing community issues and volunteer allocation.',
      },
      {
        name: 'Rahul Sharma',
        email: 'volunteer.rahul@locallens.test',
        role: 'volunteer',
        phone: '+919876543211',
        bio: 'Community volunteer focused on roads, streetlights, and sanitation.',
        categories: ['roads', 'garbage', 'streetlight'],
        skills: ['debris clearing', 'asphalt repair', 'electrical safety'],
        location: { type: 'Point', coordinates: [77.6408, 12.9784] },
        isAvailable: true,
      },
      {
        name: 'Priya Patel',
        email: 'volunteer.priya@locallens.test',
        role: 'volunteer',
        phone: '+919876543212',
        bio: 'Environmental volunteer coordinating water and public drainage interventions.',
        categories: ['water', 'drainage', 'public-safety'],
        skills: ['drainage jetting', 'water testing', 'safety triage'],
        location: { type: 'Point', coordinates: [77.5834, 12.9304] },
        isAvailable: true,
      },
      {
        name: 'Arjun Das',
        email: 'volunteer.arjun@locallens.test',
        role: 'volunteer',
        phone: '+919876543215',
        bio: 'Civic response volunteer for logistics, tools, and crowd coordination.',
        categories: ['roads', 'public-safety', 'other'],
        skills: ['logistics', 'first aid', 'crowd control'],
        location: { type: 'Point', coordinates: [77.6105, 12.9716] },
        isAvailable: true,
      },
      {
        name: 'Sneha Rao',
        email: 'volunteer.sneha@locallens.test',
        role: 'volunteer',
        phone: '+919876543216',
        bio: 'Sanitation drive coordinator and community field lead.',
        categories: ['garbage', 'drainage', 'water'],
        skills: ['waste management', 'sanitation audit'],
        location: { type: 'Point', coordinates: [77.6200, 12.9350] },
        isAvailable: true,
      },
      {
        name: 'Kavita Nair',
        email: 'volunteer.kavita@locallens.test',
        role: 'volunteer',
        phone: '+919876543217',
        bio: 'Field responder with heavy equipment and transport support.',
        categories: ['roads', 'drainage', 'garbage'],
        skills: ['heavy equipment', 'transport', 'site safety'],
        location: { type: 'Point', coordinates: [77.6350, 12.9100] },
        isAvailable: true,
      },
      {
        name: 'Anita Roy',
        email: 'citizen.anita@locallens.test',
        role: 'citizen',
        phone: '+919876543213',
        bio: 'Resident of Central Ward, passionate about neighborhood cleanliness and safety.',
      },
      {
        name: 'Vikram Mehta',
        email: 'citizen.vikram@locallens.test',
        role: 'citizen',
        phone: '+919876543214',
        bio: 'Active citizen working together with local municipal staff.',
      },
    ];

    const seededUsers = {};
    for (const u of usersData) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = await User.create({
          ...u,
          passwordHash,
          isEmailVerified: true,
          isPhoneVerified: !!u.phone,
          isActive: true,
        });
      } else {
        user.name = u.name;
        user.role = u.role;
        user.passwordHash = passwordHash;
        user.isActive = true;
        user.isEmailVerified = true;
        if (u.categories) user.categories = u.categories;
        if (u.isAvailable !== undefined) user.isAvailable = u.isAvailable;
        await user.save();
      }
      seededUsers[u.email] = user;
    }
    console.log(`✓ Seeded ${Object.keys(seededUsers).length} demo users`);

    const admin = seededUsers['admin@locallens.test'];
    const rahul = seededUsers['volunteer.rahul@locallens.test'];
    const priya = seededUsers['volunteer.priya@locallens.test'];
    const anita = seededUsers['citizen.anita@locallens.test'];
    const vikram = seededUsers['citizen.vikram@locallens.test'];

    // 2. Seed realistic Reports spread across past months
    console.log('Seeding realistic community reports...');
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneMonth = 30 * oneDay;

    const reportsData = [
      {
        title: 'Deep Pothole at 5th Main Junction',
        description: 'Large and dangerous pothole near the bus stop causing severe traffic slowdowns and hazard to two-wheelers during evening rush hour.',
        category: 'roads',
        priority: 'high',
        status: 'in-progress',
        reporter: anita._id,
        assignedVolunteer: rahul._id,
        address: '5th Main Rd, Indiranagar, Bengaluru',
        location: { type: 'Point', coordinates: [77.6408, 12.9784] },
        createdAt: new Date(now - 14 * oneDay),
        statusHistory: [
          { status: 'pending', changedBy: anita._id, changedAt: new Date(now - 14 * oneDay), note: 'Report submitted by resident.' },
          { status: 'verified', changedBy: admin._id, changedAt: new Date(now - 12 * oneDay), note: 'Verified by field inspection.' },
          { status: 'assigned', changedBy: admin._id, changedAt: new Date(now - 10 * oneDay), note: 'Assigned to volunteer Rahul.' },
          { status: 'in-progress', changedBy: rahul._id, changedAt: new Date(now - 3 * oneDay), note: 'Cold-mix asphalt patch material dispatched with ward team.' },
        ],
      },
      {
        title: 'Overflowing Municipal Garbage Bin on 2nd Cross',
        description: 'Commercial waste has piled up around the community dump site. Stray animals spreading debris onto pedestrian walkway.',
        category: 'garbage',
        priority: 'high',
        status: 'resolved',
        reporter: vikram._id,
        assignedVolunteer: rahul._id,
        address: '2nd Cross, Koramangala 4th Block, Bengaluru',
        location: { type: 'Point', coordinates: [77.6245, 12.9352] },
        createdAt: new Date(now - 45 * oneDay),
        resolvedAt: new Date(now - 42 * oneDay),
        resolutionNote: 'Sanitation compactors deployed. Area cleared, sprayed with disinfectant, and secondary bin installed.',
        statusHistory: [
          { status: 'pending', changedBy: vikram._id, changedAt: new Date(now - 45 * oneDay), note: 'Report submitted.' },
          { status: 'verified', changedBy: admin._id, changedAt: new Date(now - 44 * oneDay), note: 'Verified by zone officer.' },
          { status: 'assigned', changedBy: admin._id, changedAt: new Date(now - 44 * oneDay), note: 'Assigned to Rahul.' },
          { status: 'in-progress', changedBy: rahul._id, changedAt: new Date(now - 43 * oneDay), note: 'Compactor truck requested.' },
          { status: 'resolved', changedBy: rahul._id, changedAt: new Date(now - 42 * oneDay), note: 'Waste cleared and area sanitized.' },
        ],
      },
      {
        title: 'Clogged Stormwater Drain Causing Waterlogging',
        description: 'Monsoon silt and plastic waste has completely choked the drainage culvert outside the primary school gate.',
        category: 'drainage',
        priority: 'urgent',
        status: 'assigned',
        reporter: anita._id,
        assignedVolunteer: priya._id,
        address: 'School Road, Jayanagar 3rd Block, Bengaluru',
        location: { type: 'Point', coordinates: [77.5834, 12.9304] },
        createdAt: new Date(now - 6 * oneDay),
        statusHistory: [
          { status: 'pending', changedBy: anita._id, changedAt: new Date(now - 6 * oneDay), note: 'Report submitted.' },
          { status: 'verified', changedBy: admin._id, changedAt: new Date(now - 4 * oneDay), note: 'Verified by engineer.' },
          { status: 'assigned', changedBy: admin._id, changedAt: new Date(now - 2 * oneDay), note: 'Assigned to volunteer Priya.' },
        ],
      },
      {
        title: 'Non-Functional Streetlights on Park Perimeter',
        description: 'Three consecutive sodium lamps have been unlit for over two weeks, creating pitch-black spots near the joggers path.',
        category: 'streetlight',
        priority: 'medium',
        status: 'verified',
        reporter: vikram._id,
        address: 'Cubbon Park South Gate Rd, Bengaluru',
        location: { type: 'Point', coordinates: [77.5925, 12.9738] },
        createdAt: new Date(now - 2 * oneDay),
        statusHistory: [
          { status: 'pending', changedBy: vikram._id, changedAt: new Date(now - 2 * oneDay), note: 'Report submitted.' },
          { status: 'verified', changedBy: admin._id, changedAt: new Date(now - 1 * oneDay), note: 'Verified by electrical sub-station.' },
        ],
      },
      {
        title: 'Continuous Drinking Water Pipeline Leakage',
        description: 'Treated water gushing onto the road from underground main valve, wasting potable water and softening road foundation.',
        category: 'water',
        priority: 'urgent',
        status: 'pending',
        reporter: anita._id,
        address: '14th Cross, Malleshwaram, Bengaluru',
        location: { type: 'Point', coordinates: [77.5713, 13.0031] },
        createdAt: new Date(now - 4 * 60 * 60 * 1000), // 4 hours ago
        statusHistory: [
          { status: 'pending', changedBy: anita._id, changedAt: new Date(now - 4 * 60 * 60 * 1000), note: 'Report submitted.' },
        ],
      },
      {
        title: 'Open Electric Junction Box Near Bus Shelter',
        description: 'Exposed live wiring in an unbolted metal distribution panel within arm reach of children at the bus stop.',
        category: 'public-safety',
        priority: 'urgent',
        status: 'pending',
        reporter: vikram._id,
        address: 'MG Road Metro Station Exit B, Bengaluru',
        location: { type: 'Point', coordinates: [77.6083, 12.9756] },
        createdAt: new Date(now - 1 * 60 * 60 * 1000), // 1 hour ago
        statusHistory: [
          { status: 'pending', changedBy: vikram._id, changedAt: new Date(now - 1 * 60 * 60 * 1000), note: 'Urgent hazard reported.' },
        ],
      },
      {
        title: 'Damaged Footpath Slabs and Exposed Rebar',
        description: 'Broken concrete pavers on the walkway. Senior citizens have tripped multiple times.',
        category: 'roads',
        priority: 'medium',
        status: 'resolved',
        reporter: anita._id,
        assignedVolunteer: rahul._id,
        address: '100 Feet Rd, HAL 2nd Stage, Bengaluru',
        location: { type: 'Point', coordinates: [77.6433, 12.9698] },
        createdAt: new Date(now - 75 * oneDay),
        resolvedAt: new Date(now - 70 * oneDay),
        resolutionNote: 'PWD team replaced 15 broken slabs with interlocking tactile pavers.',
        statusHistory: [
          { status: 'pending', changedBy: anita._id, changedAt: new Date(now - 75 * oneDay), note: 'Report created.' },
          { status: 'verified', changedBy: admin._id, changedAt: new Date(now - 74 * oneDay), note: 'Inspected.' },
          { status: 'assigned', changedBy: admin._id, changedAt: new Date(now - 73 * oneDay), note: 'Assigned to Rahul.' },
          { status: 'resolved', changedBy: rahul._id, changedAt: new Date(now - 70 * oneDay), note: 'Pavers replaced.' },
        ],
      },
      {
        title: 'Raw Sewage Overflowing from Manhole Cover',
        description: 'Heavy foul odor and unsanitary wastewater pooling on the residential street.',
        category: 'drainage',
        priority: 'high',
        status: 'in-progress',
        reporter: vikram._id,
        assignedVolunteer: priya._id,
        address: '7th Block, HSR Layout, Bengaluru',
        location: { type: 'Point', coordinates: [77.6358, 12.9081] },
        createdAt: new Date(now - 5 * oneDay),
        statusHistory: [
          { status: 'pending', changedBy: vikram._id, changedAt: new Date(now - 5 * oneDay), note: 'Report logged.' },
          { status: 'verified', changedBy: admin._id, changedAt: new Date(now - 4 * oneDay), note: 'Verified.' },
          { status: 'assigned', changedBy: admin._id, changedAt: new Date(now - 3 * oneDay), note: 'Assigned to Priya.' },
          { status: 'in-progress', changedBy: priya._id, changedAt: new Date(now - 1 * oneDay), note: 'Jetting machine scheduled for morning clearance.' },
        ],
      },
    ];

    for (const r of reportsData) {
      const existing = await Report.findOne({ title: r.title });
      if (!existing) {
        const createdReport = await Report.create(r);

        // Seed sample notifications
        if (r.status === 'verified' || r.status === 'assigned' || r.status === 'resolved') {
          await Notification.create({
            recipient: r.reporter,
            report: createdReport._id,
            type: `report-${r.status}`,
            title: `Report ${r.status}`,
            message: `Your report "${r.title}" has been updated to ${r.status}.`,
            isRead: false,
          });
        }
      }
    }
    console.log(`✓ Seeded ${reportsData.length} community reports`);

    console.log('\n========================================');
    console.log('🎉 LOCALENS SEEDING COMPLETED');
    console.log('========================================');
    console.log('Demo Accounts (Password for all: Password123!)');
    console.log('1. Admin:     admin@locallens.test');
    console.log('2. Volunteer: volunteer.rahul@locallens.test');
    console.log('3. Volunteer: volunteer.priya@locallens.test');
    console.log('4. Citizen:   citizen.anita@locallens.test');
    console.log('5. Citizen:   citizen.vikram@locallens.test');
    console.log('========================================\n');
  } catch (error) {
    console.error('Seeding error:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

seedDatabase();
