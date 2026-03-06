import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export const getCommissions = async (req: Request, res: Response) => {
    try {
        const { status, referenceId, policyId } = req.query;

        let where: any = {};
        if (status) where.status = status;
        if (referenceId) where.referenceId = referenceId;
        if (policyId) where.policyId = policyId;

        const commissions: any[] = [];

        res.json(commissions);
    } catch (error) {
        console.error('Error fetching commissions:', error);
        res.status(500).json({ error: 'Failed to fetch commissions' });
    }
};

export const updateCommissionStatus = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { status, remarks } = req.body;

        const updateData: any = { status, remarks };

        if (status === 'RECEIVED') {
            updateData.receivedDate = new Date();
        } else if (status === 'PAID_OUT') {
            updateData.paidOutDate = new Date();
        }

        const commission = { id, status, remarks, ...updateData };

        res.json(commission);
    } catch (error) {
        console.error('Error updating commission:', error);
        res.status(500).json({ error: 'Failed to update commission status' });
    }
};
