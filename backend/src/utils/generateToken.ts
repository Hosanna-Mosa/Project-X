import jwt from "jsonwebtoken";

const generateToken = (id: string, role: string = "restaurant_vendor") => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || "supersecret123",
    { expiresIn: "30d" }
  );
};

export default generateToken;
