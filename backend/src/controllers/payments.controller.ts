import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { logActivity } from '../utils/audit';

const prisma = new PrismaClient();

export const getPayments = async (req: Request, res: Response) => {
    try {
        const { policyId } = req.query;
        let where: any = {};
        if (policyId) where.policyId = policyId;

        const payments: any[] = [];
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
};

export const createPayment = async (req: Request, res: Response) => {
    try {
        const { policyId, date, amount, mode, note } = req.body;

        if (!policyId || !date || typeof amount !== 'number' || !mode) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const policy = await prisma.policy.findUnique({ where: { id: policyId } });
        if (!policy) return res.status(404).json({ error: 'Policy not found' });

        // Mock payment creation
        const payment = {
            id: 'mock-payment-' + Date.now(),
            policyId,
            date: new Date(date),
            amount: parseFloat(amount.toString()),
            mode,
            note
        };

        // Update policy premiumPaid
        const newPaid = (policy.premiumPaid || 0) + payment.amount;

        await prisma.policy.update({
            where: { id: policyId },
            data: {
                premiumPaid: newPaid
            }
        });

        const authUser = (req as any).user;
        if (authUser?.id) {
            await logActivity(authUser.id, 'CREATE', 'PAYMENT', payment.id, { amount: payment.amount, policyId });
        }

        res.status(201).json(payment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create payment' });
    }
};
