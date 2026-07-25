import { Router } from 'express';
import { BannersController } from './banners.controller';

const router = Router();
const bannersController = new BannersController();

router.get('/', bannersController.getActiveBanners.bind(bannersController));

export default router;
