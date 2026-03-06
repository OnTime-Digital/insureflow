import { Router } from 'express';
import { getDashboardStats, getUpcomingRenewals, getPipelineSummary, getRecentActivity, getReportsData } from '../controllers/dashboard.controller';

const router = Router();

router.get('/stats', getDashboardStats);
router.get('/renewals', getUpcomingRenewals);
router.get('/pipeline', getPipelineSummary);
router.get('/recent-activity', getRecentActivity);
router.get('/reports', getReportsData);

export default router;
