import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const teamMessageSchema = new Schema(
  {
    report: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderRole: {
      type: String,
      enum: ['coordinator', 'lead', 'member', 'admin'],
      default: 'member',
    },
    senderAvatar: {
      type: String,
      default: '',
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    attachments: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

teamMessageSchema.index({ report: 1, createdAt: 1 });

const TeamMessage = model('TeamMessage', teamMessageSchema);

export default TeamMessage;
