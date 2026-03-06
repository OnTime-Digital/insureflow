import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { authMiddleware, restrictTo } from '../middleware/auth.middleware';

const router = Router();

// Only ADMIN can view system audit logs
router.get('/', authMiddleware, restrictTo('ADMIN'), getAuditLogs);

export default router;
