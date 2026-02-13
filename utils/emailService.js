const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendVerificationEmail = async (email, username, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
  
  const msg = {
    to: email,
    from: {
      email: process.env.EMAIL_FROM,
      name: 'Animeshki'
    },
    subject: 'Verify your email address - Animeshki',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ff5c39; margin: 0;">Animeshki</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Manga Hub</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">Welcome to Animeshki, ${username}!</h2>
          <p style="color: #666; line-height: 1.6;">
            Thank you for registering! Please click the button below to verify your email address and activate your account.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: #ff5c39; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-bottom: 0;">
            If the button above doesn't work, you can also copy and paste this link into your browser:
          </p>
          <p style="color: #666; font-size: 12px; word-break: break-all; margin: 5px 0;">
            ${verificationUrl}
          </p>
        </div>
        
        <div style="text-align: center; color: #999; font-size: 12px;">
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        </div>
      </div>
    `
  };

  try {
    await sgMail.send(msg);
    console.log('Verification email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    if (error.response) {
      console.error('Response body:', error.response.body);
    }
    return false;
  }
};

const sendPasswordResetEmail = async (email, username, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const msg = {
    to: email,
    from: {
      email: 'seregagg3@gmail.com',
      name: 'Animeshki'
    },
    subject: 'Reset your password - Animeshki',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ff5c39; margin: 0;">Animeshki</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Manga Hub</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #666; line-height: 1.6;">
            Hi ${username}, we received a request to reset your password. Click the button below to reset it.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #ff5c39; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-bottom: 0;">
            If the button above doesn't work, you can also copy and paste this link into your browser:
          </p>
          <p style="color: #666; font-size: 12px; word-break: break-all; margin: 5px 0;">
            ${resetUrl}
          </p>
        </div>
        
        <div style="text-align: center; color: #999; font-size: 12px;">
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      </div>
    `
  };

  try {
    await sgMail.send(msg);
    console.log('Password reset email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    if (error.response) {
      console.error('Response body:', error.response.body);
    }
    return false;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
