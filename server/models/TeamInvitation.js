import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const teamInvitationSchema = new Schema(
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
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending',
      index: true,
    },
    distanceKm: {
      type: Number,
      default: null,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

teamInvitationSchema.index({ report: 1, volunteer: 1 }, { unique: true });

const TeamInvitation = model('TeamInvitation', teamInvitationSchema);

export default TeamInvitation;
