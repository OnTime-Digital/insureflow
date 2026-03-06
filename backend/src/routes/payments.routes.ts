import { Router } from 'express';
import { getPayments, createPayment } from '../controllers/payments.controller';

const router = Router();

router.get('/', getPayments);
router.post('/', createPayment);

export default router;
