import { Router } from 'express';
import { getReferences, createReference, updateReference, deleteReference, bulkDeleteReferences } from '../controllers/references.controller';

const router = Router();

router.get('/', getReferences);
router.post('/bulk-delete', bulkDeleteReferences);
router.post('/', createReference);
router.put('/:id', updateReference);
router.delete('/:id', deleteReference);

export default router;
