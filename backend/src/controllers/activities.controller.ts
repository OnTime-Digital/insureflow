import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

// Get activities for a client (via their policies/renewals or standalone)
export const getActivities = async (req: Request, res: Response) => {
    try {
        const { clientId } = req.query;

        if (!clientId || typeof clientId !== 'string') {
            return res.status(400).json({ error: 'clientId is required' });
        }

        // Find all renewals for this client's policies
        const clientPolicies = await prisma.policy.findMany({
            where: { clientId },
            select: { id: true, renewals: { select: { id: true } } }
        });

        const renewalIds = clientPolicies.flatMap(p => p.renewals.map(r => r.id));

        const activities = await prisma.activity.findMany({
            where: {
                OR: [
                    { renewalId: { in: renewalIds } },
                    // Also find activities linked to renewals of this client
                ]
            },
            include: {
                user: { select: { name: true } },
                renewal: {
                    select: {
                        id: true,
                        dueDate: true,
                        policy: { select: { policyNo: true, type: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(activities);
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
};

// Create a new activity / follow-up
export const createActivity = async (req: Request, res: Response) => {
    try {
        const { clientId, type, notes, followupDate } = req.body;

        if (!type || !notes) {
            return res.status(400).json({ error: 'Type and notes are required' });
        }

        // Get or create a dummy user for now (since auth isn't implemented)
        let user = await prisma.user.findFirst();
        if (!user) {
            user = await prisma.user.create({
                data: { email: 'admin@insureflow.com', password: 'admin', name: 'Admin User', role: 'ADMIN' }
            });
        }

        // If clientId is provided, find the first renewal for that client to link
        let renewalId: string | null = null;
        if (clientId) {
            const renewal = await prisma.renewal.findFirst({
                where: { policy: { clientId } },
                orderBy: { dueDate: 'desc' }
            });
            renewalId = renewal?.id || null;
        }

        const activity = await prisma.activity.create({
            data: {
                userId: user.id,
                renewalId,
                type,
                notes,
                followupDate: followupDate ? new Date(followupDate) : null
            },
            include: {
                user: { select: { name: true } },
                renewal: {
                    select: {
                        id: true,
                        dueDate: true,
                        policy: { select: { policyNo: true, type: true } }
                    }
                }
            }
        });

        res.status(201).json(activity);
    } catch (error) {
        console.error('Error creating activity:', error);
        res.status(500).json({ error: 'Failed to create activity' });
    }
};

// Delete an activity
export const deleteActivity = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        await prisma.activity.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting activity:', error);
        res.status(500).json({ error: 'Failed to delete activity' });
    }
};
