import jwt from "jsonwebtoken";
import User, { UserRole } from "../../database/models/User";

export class AuthService {
  async requestOTP(phone: string) {
    // Dummy mode — log and return success (no SMS sent)
    console.log(`[DUMMY AUTH] OTP requested for ${phone}. Any 6-digit code will work.`);
    return { success: true, message: "OTP sent successfully" };
  }

  async verifyOTP(phone: string, _code: string, role: UserRole, name?: string) {
    // Dummy mode — ANY code is accepted. No DB lookup needed.
    console.log(`[DUMMY AUTH] Verifying OTP for ${phone}. Code: ${_code} — accepted.`);

    let user = await User.findOne({ phone });

    if (!user) {
      if (!name) {
        return { isNewUser: true };
      }
      // Create new user (Signup as DRIVER)
      user = new User({
        name,
        phone,
        role,
      });
      await user.save();

      // Driver record will be created on first onboarding save (getOrCreateDriver)
      console.log(`[DUMMY AUTH] New user created: ${name} (${phone})`);
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
