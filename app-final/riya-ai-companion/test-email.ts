import "dotenv/config";
import { sendOTPEmail } from "./server/email";

async function testEmailService() {
    console.log("🧪 Testing Resend Email Service...\n");

    const testEmail = "test@example.com"; // Change this to your email for testing
    const testOTP = "123456";
    const testName = "Test User";

    console.log(`📧 Sending test OTP to: ${testEmail}`);
    console.log(`🔑 OTP: ${testOTP}\n`);

    try {
        await sendOTPEmail(testEmail, testOTP, testName);
        console.log("\n✅ Email sent successfully!");
        console.log("Check the console logs above to see which service was used.");
    } catch (error) {
        console.error("\n❌ Email sending failed:", error);
        process.exit(1);
    }
}

testEmailService();
