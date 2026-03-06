import { Router } from 'express';
import { getPolicyDocuments, uploadPolicyDocument, deletePolicyDocument } from '../controllers/policyDocuments.controller';

const router = Router();

router.get('/', getPolicyDocuments);
router.post('/', uploadPolicyDocument);
router.delete('/:id', deletePolicyDocument);

export default router;
