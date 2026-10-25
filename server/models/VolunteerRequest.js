import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const volunteerRequestSchema = new Schema(
  {
    report: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
      index: true,
    },
    volunteer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    distanceKm: {
      type: Number,
      default: null,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

volunteerRequestSchema.index({ report: 1, volunteer: 1, status: 1 });

const VolunteerRequest = model('VolunteerRequest', volunteerRequestSchema);

export default VolunteerRequest;
