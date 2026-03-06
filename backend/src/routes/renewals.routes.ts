import { Router } from 'express';
import {
    getRenewals,
    updateRenewalStatus,
    markRenewed,
    addFollowUp,
    getRenewalHistory
} from '../controllers/renewals.controller';

const router = Router();

router.get('/', getRenewals);
router.put('/:id/status', updateRenewalStatus);
router.post('/:id/renew', markRenewed);
router.post('/:id/followup', addFollowUp);
router.get('/:policyId/history', getRenewalHistory);

export default router;
