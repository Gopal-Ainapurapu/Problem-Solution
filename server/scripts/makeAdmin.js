import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import User from '../models/User.js';

async function makeAdmin() {
  try {
    const email = process.argv[2]?.trim().toLowerCase();

    if (!email) {
      throw new Error(
        'Usage: npm run make-admin -- your-email@example.com'
      );
    }

    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing from server/.env');
    }

    await mongoose.connect(process.env.MONGO_URI);

    const user = await User.findOne({ email });

    if (!user) {
      throw new Error(
        'User not found. Register this account first.'
      );
    }

    user.role = 'admin';
    await user.save();

    console.log(`Admin role assigned to ${user.email}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

makeAdmin();
