import jwt from "jsonwebtoken";
import { AppDataSource } from "../../database/data-source";
import { User, UserRole } from "../../database/entities/User";
import { OTP } from "../../database/entities/OTP";
import { MoreThan } from "typeorm";

const userRepository = AppDataSource.getRepository(User);
const otpRepository = AppDataSource.getRepository(OTP);

export class AuthService {
  async requestOTP(phone: string) {
    // Generate a 6-digit OTP code (mock)
    const code = "123456"; // Hardcoded for now as per user requirement
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save OTP to database
    const otp = otpRepository.create({
      phone,
      code,
      expiresAt,
    });
    await otpRepository.save(otp);

    console.log(`OTP for ${phone}: ${code}`);
    // In future, send via SMS service here
    return { success: true, message: "OTP sent successfully" };
  }

  async verifyOTP(phone: string, code: string, role: UserRole, name?: string) {
    const otp = await otpRepository.findOne({
      where: {
        phone,
        code,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: "DESC" },
    });

    if (!otp) {
      throw new Error("Invalid or expired OTP");
    }

    let user = await userRepository.findOne({ where: { phone } });

    if (!user && !name) {
      // User not found and no name provided (initial verification)
      // DO NOT mark OTP as used yet, so it can be used again for registration
      return { isNewUser: true };
    }

    // Mark OTP as used
    otp.isUsed = true;
    await otpRepository.save(otp);

    if (!user) {
      if (!name) {
        // User not found and no name provided
        return { isNewUser: true };
      }
      // Create new user (Signup)
      user = userRepository.create({
        name,
        phone,
        role,
      });
      await userRepository.save(user);
    }

    const token = this.generateToken(user.id, user.role);
    return { user, token, isNewUser: false };
  }

  generateToken(userId: string, role: UserRole) {
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: (process.env.JWT_EXPIRES_IN || "30d") as any }
    );
  }
}
