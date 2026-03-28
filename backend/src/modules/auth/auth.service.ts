import jwt from "jsonwebtoken";
import { AppDataSource } from "../../database/data-source";
import { User, UserRole } from "../../database/entities/User";

const userRepository = AppDataSource.getRepository(User);

export class AuthService {
  async loginWithOTP(phone: string, role: UserRole) {
    // Mock OTP logic: assume OTP is 1234
    // Usually, you would integrate a SMS service here
    
    let user = await userRepository.findOne({ where: { phone } });

    if (!user) {
      user = userRepository.create({
        name: `User_${phone.slice(-4)}`,
        phone,
        role,
      });
      await userRepository.save(user);
    }

    const token = this.generateToken(user.id, user.role);
    return { user, token };
  }

  generateToken(userId: string, role: UserRole) {
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
  }
}
