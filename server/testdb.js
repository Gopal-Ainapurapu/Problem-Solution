import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGO_URI || '';
const m = uri.match(/^mongodb(?:\+srv)?:\/\/([^:]+):([^@]*)@([^/?]+)/);
console.log('Loaded:', !!uri);
console.log('Username:', m?.[1]);
console.log('Password length:', m?.[2]?.length);
console.log('Host:', m?.[3]);

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log('CONNECTED');
} catch (e) {
  console.log('FAILED:', e.message);
}
process.exit(0);