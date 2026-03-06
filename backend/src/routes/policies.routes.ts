import { Router } from 'express';
import multer from 'multer';
import {
    getPolicies,
    getPolicyById,
    createPolicy,
    updatePolicy,
    deletePolicy,
    exportPolicies,
    importPolicies,
    importPoliciesJson
} from '../controllers/policies.controller';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.get('/export', exportPolicies);
router.post('/import', upload.single('file'), importPolicies);
router.post('/import-json', importPoliciesJson);

router.get('/', getPolicies);
router.get('/:id', getPolicyById);
router.post('/', createPolicy);
router.put('/:id', updatePolicy);
router.delete('/:id', deletePolicy);

export default router;
