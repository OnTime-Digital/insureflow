import { Router } from 'express';
import {
    getMonthlyReport,
    exportMonthlyReport
} from '../controllers/monthly-reports.controller';

const router = Router();

router.get('/', getMonthlyReport);
router.get('/export', exportMonthlyReport);

export default router;
