import jwt from "jsonwebtoken";
import User, { UserRole } from "../../database/models/User";
import { ValidationError, UnauthorizedError, NotFoundError, ForbiddenError } from "../../utils/errors";

export class AuthService {
  async requestOTP(phone: string) {
    // Dummy mode — log and return success (no SMS sent)
    console.log(`[DUMMY AUTH] OTP requested for ${phone}. Any 6-digit code will work.`);
    return { success: true, message: "OTP sent successfully" };
  }

  async verifyOTP(phone: string, _code: string, role: UserRole, name?: string, password?: string) {
    // Dummy mode — ANY code is accepted. No DB lookup needed.
    console.log(`[DUMMY AUTH] Verifying OTP for ${phone}. Code: ${_code} — accepted.`);

    let user = await User.findOne({ phone });

    if (!user) {
      if (!name) {
        return { isNewUser: true };
      }
      if (!password) {
        throw new ValidationError("Password is required for new user registration");
      }
      // Create new user with password
      user = new User({
        name,
        phone,
        role,
        password,
      });
      await user.save();

      // Driver record will be created on first onboarding save (getOrCreateDriver)
      console.log(`[DUMMY AUTH] New user created: ${name} (${phone}) with password`);
    }

    const token = this.generateToken((user._id as any).toString(), user.role);
    return { user, token, isNewUser: false };
  }

  async loginWithPassword(phone: string, password: string, role: UserRole) {
    const user = await User.findOne({ phone });

    if (!user) {
      throw new NotFoundError("User not found. Please sign up first.");
    }

    if (!user.password) {
      throw new ValidationError("No password set on this account. Please use OTP login.");
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid password");
    }

    if (user.role !== role) {
      throw new ForbiddenError("Unauthorized role");
    }

    const token = this.generateToken((user._id as any).toString(), user.role);
    return { user, token };
  }

  generateToken(userId: string, role: UserRole) {
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "30d" } // 30 days
    );
  }
}
