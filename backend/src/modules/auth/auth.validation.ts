import { z } from "zod";
import { UserRole } from "../../database/models/User";

export const requestOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must be at most 15 digits"),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    code: z.string().min(4, "OTP code must be at least 4 digits"),
    role: z.nativeEnum(UserRole),
    name: z.string().optional(),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
  }),
});

export const loginWithPasswordSchema = z.object({
  body: z.object({
    phone: z.string().trim().min(3, "Phone or email is required"),
    password: z.string().min(1, "Password is required"),
    role: z.nativeEnum(UserRole),
  }),
});

