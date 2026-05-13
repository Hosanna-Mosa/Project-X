import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class CloudinaryService {
  async uploadImage(fileBuffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "food_items",
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error("Upload failed"));
          resolve(result.secure_url);
        }
      );

      uploadStream.end(fileBuffer);
    });
  }

  async uploadMultipleImages(fileBuffers: Buffer[]): Promise<string[]> {
    const uploadPromises = fileBuffers.map((buffer) => this.uploadImage(buffer));
    return Promise.all(uploadPromises);
  }
}
