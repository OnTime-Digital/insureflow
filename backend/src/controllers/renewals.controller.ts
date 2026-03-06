import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { logActivity } from '../utils/audit';

const prisma = new PrismaClient();

// Get renewals with pipeline filters
export const getRenewals = async (req: Request, res: Response) => {
    try {
        const { dateFilter, type, status, from, to } = req.query;

        let where: any = {};

        // Pipeline filters
        if (status) {
            where.status = status;
        }

        if (type) {
            where.policy = { type };
        }

        // Date filters for due date
        const today = new Date();
        if (from && to) {
            where.dueDate = {
                gte: new Date(from as string),
                lte: new Date(to as string)
            };
        } else if (dateFilter === 'today') {
            where.dueDate = {
                gte: startOfDay(today),
                lte: endOfDay(today)
            };
        } else if (dateFilter === 'week') {
            where.dueDate = {
                gte: startOfWeek(today),
                lte: endOfWeek(today)
            };
        } else if (dateFilter === 'month') {
            where.dueDate = {
                gte: startOfMonth(today),
                lte: endOfMonth(today)
            };
        }

        // Exclude cancelled policies
        if (!where.policy) where.policy = {};
        where.policy.status = { not: 'CANCELLED' };

        const renewals = await prisma.renewal.findMany({
            where,
            include: {
                policy: {
                    include: {
                        client: { select: { id: true, name: true, mobile: true, email: true } },
                    }
                }
            },
            orderBy: { dueDate: 'asc' }
        });

        res.json(renewals);
    } catch (error) {
        console.error('Error fetching renewals:', error);
        res.status(500).json({ error: 'Failed to fetch renewals' });
    }
};

// Update renewal status (Mark Called, Payment Pending, etc)
export const updateRenewalStatus = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { status, lostReason } = req.body;

        if (status === 'LOST' && !lostReason) {
            return res.status(400).json({ error: 'Lost reason is mandatory when marking as LOST.' });
        }

        const renewal = await prisma.renewal.update({
            where: { id },
            data: { status },
            include: { policy: true }
        });

        // Add a system activity for the status change
        const user = await prisma.user.findFirst();
        if (user) {
            await prisma.activity.create({
                data: {
                    userId: user.id,
                    renewalId: id,
                    type: 'SYSTEM_UPDATE',
                    notes: `Renewal status updated to ${status}.${lostReason ? ' Reason: ' + lostReason : ''}`
                }
            });
        }

        const authUser = (req as any).user;
        if (authUser?.id) {
            await logActivity(authUser.id, 'UPDATE_STATUS', 'RENEWAL', id, { status, lostReason });
        }

        res.json(renewal);
    } catch (error) {
        console.error('Error updating renewal status:', error);
        res.status(500).json({ error: 'Failed to update renewal status' });
    }
};

// Mark as renewed (special action)
export const markRenewed = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { newExpiryDate, newPremium, remark } = req.body;

        if (!newExpiryDate || !newPremium) {
            return res.status(400).json({ error: 'New expiry date and premium are required.' });
        }

        const renewal = await prisma.renewal.findUnique({
            where: { id },
            include: { policy: true }
        });

        if (!renewal) return res.status(404).json({ error: 'Renewal not found.' });

        // Update Policy dates & premium
        await prisma.policy.update({
            where: { id: renewal.policyId },
            data: {
                startDate: renewal.policy.expiryDate,
                expiryDate: new Date(newExpiryDate),
                premium: parseFloat(newPremium),
                premiumPaid: 0,
                status: 'ACTIVE',
                nextRenewalDate: new Date(newExpiryDate)
            }
        });

        // Mark this renewal as RENEWED
        const updatedRenewal = await prisma.renewal.update({
            where: { id },
            data: { status: 'RENEWED' }
        });

        // Auto-create next renewal task based on new expiry date
        await prisma.renewal.create({
            data: {
                policyId: renewal.policyId,
                dueDate: new Date(new Date(newExpiryDate).setDate(new Date(newExpiryDate).getDate() - 30)),
                status: 'NEW',
            }
        });

        // Audit Log
        if ((req as any).user?.id) {
            await logActivity((req as any).user.id, 'MARK_RENEWED', 'RENEWAL', id, { newExpiryDate, newPremium });
        }

        res.json(updatedRenewal);
    } catch (error) {
        console.error('Error marking as renewed:', error);
        res.status(500).json({ error: 'Failed to mark as renewed' });
    }
};

export const addFollowUp = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { comment, nextFollowUp } = req.body;
        const renewal = await prisma.renewal.findUnique({ where: { id } });

        // Create an activity
        const user = await prisma.user.findFirst();
        if (user) {
            await prisma.activity.create({
                data: {
                    userId: user.id,
                    renewalId: id,
                    type: 'FOLLOW_UP',
                    notes: comment || 'Follow-up created',
                    followupDate: nextFollowUp ? new Date(nextFollowUp) : null
                }
            });
        }

        res.json(renewal);
    } catch (error) {
        console.error('Error adding followup:', error);
        res.status(500).json({ error: 'Failed to add followup' });
    }
};

export const getRenewalHistory = async (req: Request, res: Response) => {
    try {
        const policyId = req.params.policyId as string;
        const history: any[] = [];
        res.json(history);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch renewal history' });
    }
};
