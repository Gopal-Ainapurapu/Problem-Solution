
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    // Basic user information
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please enter a valid email address',
      ],
    },

    // Store a bcrypt hash, never a plain password
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    // Account role
    role: {
      type: String,
      enum: ['citizen', 'volunteer', 'admin'],
      default: 'citizen',
      required: true,
    },

    // Profile information
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: undefined,
    },

    profileImage: {
      type: String,
      trim: true,
      default: undefined,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },

    // GeoJSON location: [longitude, latitude]
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        default: undefined,
        validate: {
          validator(value) {
            if (value == null) return true;
            if (!Array.isArray(value) || value.length !== 2) {
              return false;
            }

            const [longitude, latitude] = value;

            return (
              Number.isFinite(longitude) &&
              Number.isFinite(latitude) &&
              longitude >= -180 &&
              longitude <= 180 &&
              latitude >= -90 &&
              latitude <= 90
            );
          },
          message:
            'Coordinates must be [longitude, latitude] within valid ranges.',
        },
      },
    },

    // Volunteer preferences
    serviceRadiusMeters: {
      type: Number,
      min: 100,
      max: 100000,
      default: 5000,
    },

    categories: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
      validate: {
        validator: (value) => value.length <= 30,
        message: 'A maximum of 30 categories is allowed.',
      },
    },

    isAvailable: {
      type: Boolean,
      default: false,
    },

    // Task statistics
    activeTasks: {
      type: Number,
      default: 0,
      min: 0,
    },

    completedTasks: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Rating statistics
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalRatings: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Account status
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastActiveAt: {
      type: Date,
      default: null,
    },

    // Increment to invalidate existing tokens
    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.tokenVersion;
        return ret;
      },
    },
  }
);

// Indexes for location-based volunteer matching
userSchema.index({ location: '2dsphere' });
userSchema.index({ role: 1, isAvailable: 1, isActive: 1 });

const User = model('User', userSchema);

export default User;
