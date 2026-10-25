
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});
const config = cloudinary.config();

console.log('Cloudinary config check:', {
  cloud_name_loaded: Boolean(config.cloud_name),
  api_key_loaded: Boolean(config.api_key),
  api_secret_loaded: Boolean(config.api_secret),
});

export default cloudinary;
