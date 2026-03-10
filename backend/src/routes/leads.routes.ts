import { Router } from 'express';
import {
    getLeads,
    createLead,
    updateLead,
    deleteLead,
    bulkDeleteLeads,
    bulkUpdateLeadStatus,
    getLeadActivities,
    addLeadActivity
} from '../controllers/leads.controller';

const router = Router();

router.get('/', getLeads);
router.post('/', createLead);
router.post('/bulk-delete', bulkDeleteLeads);
router.put('/bulk-status', bulkUpdateLeadStatus);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);
router.get('/:id/activities', getLeadActivities);
router.post('/:id/activities', addLeadActivity);

export default router;
