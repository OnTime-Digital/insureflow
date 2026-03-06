import { Router } from 'express';
import { getCommissions, updateCommissionStatus } from '../controllers/commissions.controller';

const router = Router();

// In a real app, middleware like requireManager or requireAdmin would go here
router.get('/', getCommissions);
router.put('/:id/status', updateCommissionStatus);

export default router;
