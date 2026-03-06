import { Router } from 'express';
import multer from 'multer';
import {
    getClients,
    getClientById,
    createClient,
    updateClient,
    deleteClient,
    exportClients,
    importClients,
    importClientsJson
} from '../controllers/clients.controller';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.get('/export', exportClients);
router.post('/import', upload.single('file'), importClients);
router.post('/import-json', importClientsJson);

router.get('/', getClients);
router.get('/:id', getClientById);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

export default router;
