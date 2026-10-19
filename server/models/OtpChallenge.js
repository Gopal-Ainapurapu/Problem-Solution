
import mongoose from 'mongoose';

const otpChallengeSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ['register', 'login', 'password-reset'],
      required: true,
    },
    channel: {
      type: String,
      enum: ['email', 'sms'],
      required: true,
    },
    phone: {
      type: String,
      default: undefined,
    },
    codeHash: {
      type: String,
      default: undefined,
      select: false,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
      select: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },
  },
  { timestamps: true, versionKey: false }
);

otpChallengeSchema.index({ email: 1, purpose: 1, channel: 1 });

export default mongoose.model('OtpChallenge', otpChallengeSchema);
