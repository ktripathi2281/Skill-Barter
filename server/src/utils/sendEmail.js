const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: `"Skill Barter" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify your Skill Barter account',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #13131a; border-radius: 16px; color: #e4e4e7;">
        <h1 style="text-align: center; color: #818cf8; margin-bottom: 8px;">Skill Barter</h1>
        <p style="text-align: center; color: #a1a1aa; margin-bottom: 24px;">Verify your email to get started</p>
        <div style="text-align: center; background: #1c1c28; padding: 24px; border-radius: 12px; border: 1px solid #2d2d3d;">
          <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 14px;">Your verification code is:</p>
          <h2 style="margin: 0; font-size: 36px; letter-spacing: 8px; color: #818cf8; font-weight: 700;">${otp}</h2>
        </div>
        <p style="text-align: center; color: #71717a; font-size: 13px; margin-top: 20px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendOTP;
