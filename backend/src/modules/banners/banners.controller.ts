import { Request, Response } from 'express';
import Banner from '../../database/models/Banner';

export class BannersController {
  public async getActiveBanners(req: Request, res: Response): Promise<void> {
    try {
      const banners = await Banner.find({ isActive: true }).sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: banners });
    } catch (error: any) {
      console.error('Error fetching banners:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}
