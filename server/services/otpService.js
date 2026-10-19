
import { Resend } from 'resend';
import twilio from 'twilio';

let resendClient;
let twilioClient;

function getResendClient() {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error('Email OTP provider is not configured.');
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

function getTwilioClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;

  if (
    !TWILIO_ACCOUNT_SID ||
    !TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_VERIFY_SERVICE_SID
  ) {
    throw new Error('SMS OTP provider is not configured.');
  }

  if (!twilioClient) {
    twilioClient = twilio(
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN
    );
  }

  return twilioClient;
}

// Send an application-generated email OTP.
// The caller must generate, expire, and securely store the code.
export async function sendEmailOtp(email, code) {
  const resend = getResendClient();

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: [email],
    subject: 'Your LocalLens verification code',
    text: `Your LocalLens verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2>LocalLens verification</h2>
        <p>Use the following code to continue:</p>
        <p style="font-size:30px;font-weight:bold;letter-spacing:8px">
          ${code}
        </p>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request this code, ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    console.error('Email OTP delivery failed:', error.message);
    throw new Error('Unable to send the verification email.');
  }

  return data;
}

// Twilio Verify generates and sends its own SMS code.
export async function sendSmsOtp(phone) {
  const client = getTwilioClient();

  return client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verifications.create({
      to: phone,
      channel: 'sms',
    });
}

// Validate an SMS code using Twilio Verify.
export async function verifySmsOtp(phone, code) {
  const client = getTwilioClient();

  const result = await client.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({
      to: phone,
      code,
    });

  return result.status === 'approved';
}
