import { Response } from "express";
import User from "../../database/models/User";
import { AuthRequest } from "../../middleware/auth.middleware";
import cloudinary from "../../utils/cloudinary";

export class UsersController {
  async getProfile(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user?.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.json(user);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, username, email, phone, bio } = req.body;
      const user = await User.findById(req.user?.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (name) user.name = name;
      if (username) user.username = username;
      if (email) user.email = email;
      if (phone) user.phone = phone;

      await user.save();
      return res.json(user);
    } catch (error: any) {
      console.error("Update profile error:", error);
      if (error.code === 11000) {
        return res.status(400).json({ message: "Username or Email already exists" });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async uploadProfilePic(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const user = await User.findById(req.user?.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Upload to Cloudinary using stream
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: "profile_pics" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file!.buffer);
      }) as any;

      user.profilePic = result.secure_url;
      await user.save();

      return res.json({ profilePic: user.profilePic, user });
    } catch (error: any) {
      console.error("Upload profile pic error:", error);
      return res.status(500).json({ message: error.message || "Failed to upload image" });
    }
  }

  async addAddress(req: AuthRequest, res: Response) {
    try {
      const { label, addressLine, phone, coordinates } = req.body;
      const user = await User.findById(req.user?.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const newAddress = {
        label,
        addressLine,
        phone,
        location: {
          type: "Point",
          coordinates: [coordinates.lng, coordinates.lat],
        },
      };

      user.addresses.push(newAddress as any);
      await user.save();
      return res.status(201).json(user.addresses);
    } catch (error: any) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async updateAddress(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { label, addressLine, phone, coordinates } = req.body;
      const user = await User.findById(req.user?.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const address = user.addresses.find((a: any) => a._id?.toString() === id);
      if (!address) return res.status(404).json({ message: "Address not found" });

      if (label) address.label = label;
      if (addressLine) address.addressLine = addressLine;
      if (phone) address.phone = phone;
      if (coordinates) {
        address.location = {
          type: "Point",
          coordinates: [coordinates.lng, coordinates.lat],
        };
      }

      await user.save();
      return res.json(user.addresses);
    } catch (error) {
      console.error("Update address error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async deleteAddress(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = await User.findById(req.user?.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      user.addresses = user.addresses.filter((a: any) => a._id?.toString() !== id) as any;
      await user.save();
      return res.json(user.addresses);
    } catch (error) {
      console.error("Delete address error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async getAddresses(req: AuthRequest, res: Response) {
    try {
      const user = await User.findById(req.user?.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      return res.json(user.addresses || []);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}


