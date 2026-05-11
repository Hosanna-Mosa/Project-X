import jwt from "jsonwebtoken";
import User, { UserRole } from "../../database/models/User";
import OTP from "../../database/models/OTP";

export class AuthService {
  async requestOTP(phone: string) {
    // Generate a 6-digit OTP code (mock)
    const code = "123456"; // Hardcoded for now as per user requirement
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save OTP to database
    const otp = new OTP({
      phone,
      code,
      expiresAt,
    });
    await otp.save();

    console.log(`OTP for ${phone}: ${code}`);
    // In future, send via SMS service here
    return { success: true, message: "OTP sent successfully" };
  }

  async verifyOTP(phone: string, code: string, role: UserRole, name?: string) {
    const otp = await OTP.findOne({
      phone,
      code,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otp) {
      throw new Error("Invalid or expired OTP");
    }

    let user = await User.findOne({ phone });

    if (!user && !name) {
      // User not found and no name provided (initial verification)
      // DO NOT mark OTP as used yet, so it can be used again for registration
      return { isNewUser: true };
    }

    // Mark OTP as used
    otp.isUsed = true;
    await otp.save();

    if (!user) {
      if (!name) {
        // User not found and no name provided
        return { isNewUser: true };
      }
      // Create new user (Signup)
      user = new User({
        name,
        phone,
        role,
      });
      await user.save();
    }

    const token = this.generateToken((user._id as any).toString(), user.role);
    return { user, token, isNewUser: false };
  }

  async loginWithPassword(phone: string, password: string, role: UserRole) {
    const user = await User.findOne({ phone });

    if (!user) {
      throw new Error("User not found");
    }

    // Since it's a default password, we check directly or with bcrypt if we used it.
    // Given the prompt, we'll check directly.
    if (user.password !== password) {
      throw new Error("Invalid password");
    }

    if (user.role !== role) {
      throw new Error("Unauthorized role");
    }

    const token = this.generateToken((user._id as any).toString(), user.role);
    return { user, token };
  }

  generateToken(userId: string, role: UserRole) {
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "30d" } // 2 weeks
    );
  }
}
