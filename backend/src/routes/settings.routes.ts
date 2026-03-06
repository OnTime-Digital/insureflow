import { Router } from 'express';
import { getSettings, updateSettings, getBranding } from '../controllers/settings.controller';

const router = Router();

router.get('/', getSettings);
router.get('/branding', getBranding);
router.put('/', updateSettings);
router.post('/', updateSettings); // Support POST as well (frontend uses POST for single-pair updates)

export default router;
