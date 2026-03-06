import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { subDays, addDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const { from, to } = req.query;

        // Date range filter
        let dateFilter: any = {};
        if (from && to) {
            dateFilter = {
                createdAt: {
                    gte: new Date(from as string),
                    lte: new Date(to as string)
                }
            };
        }

        const activePolicies = await prisma.policy.count({
            where: { status: 'ACTIVE', ...dateFilter }
        });

        const totalClients = await prisma.client.count({
            where: dateFilter
        });

        const pendingRenewals = await prisma.renewal.count({
            where: {
                status: { in: ['NEW', 'PAYMENT_PENDING'] },
                ...(from && to ? {
                    dueDate: {
                        gte: new Date(from as string),
                        lte: new Date(to as string)
                    }
                } : {})
            }
        });

        const newLeads = await prisma.lead.count({
            where: {
                ...(from && to ? {
                    createdAt: {
                        gte: new Date(from as string),
                        lte: new Date(to as string)
                    }
                } : {
                    createdAt: { gte: subDays(new Date(), 30) }
                })
            }
        });

        // Aggregation for total premium
        const premiumAgg = await prisma.policy.aggregate({
            _sum: { premium: true },
            where: { status: 'ACTIVE', ...dateFilter }
        });

        // Life EP total (earned premium for Life policies)
        const lifeEpAgg = await prisma.policy.aggregate({
            _sum: { premium: true },
            where: { type: 'Life', status: 'ACTIVE', ...dateFilter }
        });

        // Policies created in range
        const policiesCreated = await prisma.policy.count({
            where: dateFilter
        });

        // Renewals due in range
        const renewalsDue = await prisma.renewal.count({
            where: {
                ...(from && to ? {
                    dueDate: {
                        gte: new Date(from as string),
                        lte: new Date(to as string)
                    }
                } : {
                    dueDate: {
                        gte: new Date(),
                        lte: addDays(new Date(), 30)
                    }
                })
            }
        });

        res.json({
            activePolicies,
            totalClients,
            pendingRenewals,
            newLeads,
            totalPremium: premiumAgg._sum.premium || 0,
            lifeEpTotal: lifeEpAgg._sum.premium || 0,
            policiesCreated,
            renewalsDue
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};

export const getUpcomingRenewals = async (req: Request, res: Response) => {
    try {
        const next30Days = addDays(new Date(), 30);

        const expiringPolicies = await prisma.policy.findMany({
            where: {
                expiryDate: { lte: next30Days, gte: subDays(new Date(), 30) }, // Also include recently expired
                status: 'ACTIVE'
            },
            include: { client: true },
            orderBy: { expiryDate: 'asc' },
            take: 10
        });

        res.json(expiringPolicies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch renewals' });
    }
};

export const getRecentActivity = async (req: Request, res: Response) => {
    try {
        const recentPolicies = await prisma.policy.findMany({
            include: { client: true },
            orderBy: { createdAt: 'desc' },
            take: 5
        });
        res.json(recentPolicies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch recent activity' });
    }
};

export const getPipelineSummary = async (req: Request, res: Response) => {
    try {
        const pipeline = await prisma.lead.groupBy({
            by: ['status'],
            _count: true,
        });
        res.json(pipeline);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pipeline' });
    }
};

export const getReportsData = async (req: Request, res: Response) => {
    try {
        const { from, to } = req.query;

        // Date range filter on createdAt
        let dateFilter: any = {};
        if (from && to) {
            dateFilter = {
                createdAt: {
                    gte: new Date(from as string),
                    lte: new Date(to as string)
                }
            };
        }

        // Policy distribution by type
        const policyByType = await prisma.policy.groupBy({
            by: ['type'],
            _count: true,
            _sum: { premium: true },
            where: dateFilter,
        });

        // Total premium stats
        const totalPremium = await prisma.policy.aggregate({
            _sum: { premium: true, premiumPaid: true },
            where: { status: 'ACTIVE', ...dateFilter },
        });

        // Overall counts
        const [totalPolicies, activePolicies, totalClients, totalLeads] = await Promise.all([
            prisma.policy.count({ where: dateFilter }),
            prisma.policy.count({ where: { status: 'ACTIVE', ...dateFilter } }),
            prisma.client.count({ where: dateFilter }),
            prisma.lead.count({ where: dateFilter }),
        ]);

        // Lead conversion
        const closedWon = await prisma.lead.count({ where: { status: 'CLOSED_WON', ...dateFilter } });
        const closedLost = await prisma.lead.count({ where: { status: 'CLOSED_LOST', ...dateFilter } });
        const conversionRate = totalLeads > 0 ? Math.round((closedWon / totalLeads) * 100) : 0;

        // Monthly premium data (last 6 months or within range)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const recentPolicies = await prisma.policy.findMany({
            where: from && to ? dateFilter : { createdAt: { gte: sixMonthsAgo } },
            select: { premium: true, createdAt: true },
        });

        const monthlyData: Record<string, number> = {};
        recentPolicies.forEach(p => {
            const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[key] = (monthlyData[key] || 0) + p.premium;
        });

        // Renewals due in range
        const renewalsDue = await prisma.renewal.count({
            where: {
                ...(from && to ? {
                    dueDate: {
                        gte: new Date(from as string),
                        lte: new Date(to as string)
                    }
                } : {})
            }
        });

        res.json({
            policyByType,
            totalPremium: totalPremium._sum.premium || 0,
            totalPremiumPaid: totalPremium._sum.premiumPaid || 0,
            totalPolicies,
            activePolicies,
            totalClients,
            totalLeads,
            closedWon,
            closedLost,
            conversionRate,
            monthlyPremium: monthlyData,
            renewalsDue,
        });
    } catch (error) {
        console.error('Reports data error:', error);
        res.status(500).json({ error: 'Failed to fetch reports data' });
    }
};
