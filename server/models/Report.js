
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const reportSchema = new Schema(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 120
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 3000
    },

    category: {
      type: String,
      enum: [
        'garbage',
        'roads',
        'water',
        'electricity',
        'streetlight',
        'drainage',
        'public-safety',
        'other'
      ],
      required: true
    },

    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator(value) {
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
          message: 'Coordinates must be [longitude, latitude].'
        }
      }
    },

    address: {
      type: String,
      trim: true,
      maxlength: 300
    },

    images: {
      type: [{
        type: String,
        trim: true,
        maxlength: 2048
      }],
      default: [],
      validate: {
        validator: value => value.length <= 5,
        message: 'A maximum of 5 images is allowed.'
      }
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },

    status: {
      type: String,
      enum: [
        'pending',
        'verified',
        'assigned',
        'in-progress',
        'resolved',
        'rejected'
      ],
      default: 'pending'
    },

    assignedVolunteer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    resolutionNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },

    resolvedAt: {
      type: Date,
      default: null
    },

    statusHistory: {
      type: [{
        status: {
          type: String,
          enum: [
            'pending',
            'verified',
            'assigned',
            'in-progress',
            'resolved',
            'rejected'
          ],
          required: true
        },
        changedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        note: {
          type: String,
          trim: true,
          maxlength: 500,
          default: ''
        },
        changedAt: {
          type: Date,
          default: Date.now
        }
      }],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

reportSchema.index({ location: '2dsphere' });
reportSchema.index({ status: 1, category: 1, createdAt: -1 });
reportSchema.index({ reporter: 1, createdAt: -1 });

const Report = model('Report', reportSchema);

export default Report;
