import { Router } from 'express';
import { getDocuments, getDocumentById, createDocument, deleteDocument, downloadDocument } from '../controllers/documents.controller';

const router = Router();

router.get('/', getDocuments);
router.get('/:id/download', downloadDocument); // Must be before /:id
router.get('/:id', getDocumentById);
router.post('/', createDocument);
router.delete('/:id', deleteDocument);

export default router;
