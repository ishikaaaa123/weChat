// Email sending is intentionally left for your implementation.
// Add your SMTP/Nodemailer provider configuration and email OTP function here.
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const transporter = nodemailer.createTransport({
    service:'gmail',
    auth:{
        user:process.env.EMAIL_USER,
        pass:process.env.EMAIL_PASS
    }
});

transporter.verify((error,success)=>{
    if (error){
        console.error("gmail connection failed:", error.message);
        
    }else{
        console.log("gmail connection succeeded");
        
    }
})

const sendOtpToEmail = async (email, otp) => {
    const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #075e54;">🔐 WeChat Verification</h2>

        <p>Hi there,</p>

        <p>Your one-time password (OTP) to verify your WhatsApp Web account is:</p>

        <h1 style="background: #e8f7fa; color: #000; padding: 10px 20px; display: inline-block; border-radius: 5px; letter-spacing: 2px;">
            ${otp}
        </h1>

        <p>
            <strong>This OTP is valid for the next 5 minutes.</strong>
            Please do not share this code with anyone.
        </p>

        <p>If you didn't request this OTP, please ignore this email.</p>

        <p style="margin-top: 20px;">
            Thanks & Regards,<br/>
            WeChat Security Team
        </p>

        <hr style="margin: 30px 0;" />

        <small style="color: #777;">
            This is an automated message. Please do not reply.
        </small>
    </div>
    `;
    await transporter.sendMail({
        from:`weChat < ${process.env.EMAIL_USER}`,
        to: email,
        subject:   `weChat verification code`,
        html:html,
    })
};

module.exports = sendOtpToEmail;
