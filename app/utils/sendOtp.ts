import axios from "axios";
export async function sendOtp(phone: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        const payload = {
            "route": process.env.FAST2SMS_ROUTE,
            "sender_id": process.env.FAST2SMS_SENDER_ID,
            "message": process.env.FAST2SMS_MESSAGE,
            "variables_values": otp ,
            "numbers":  phone 
        }
        const response = await axios.post(
            "https://www.fast2sms.com/dev/bulkV2",
            payload,
            {
                headers: {
                    authorization: process.env.FAST2SMS_API_KEY,
                    "Content-Type": "application/json"
                }
            }
        );

        if (response.data.return) {
            return otp;
        } else {
            throw new Error(response.data.message || "Failed to send OTP");
        }
    } catch (error: any) {
        console.error(error)
        console.error("Fast2SMS error:", error.response?.data || error.message);
    }
}
