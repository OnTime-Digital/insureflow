import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

// Get monthly report data
export const getMonthlyReport = async (req: Request, res: Response) => {
    try {
        const { month } = req.query; // Expected format: "2026-03"

        if (!month || typeof month !== 'string') {
            return res.status(400).json({ error: 'Month parameter is required (format: YYYY-MM)' });
        }

        const [year, mon] = month.split('-').map(Number);
        const startDate = new Date(year, mon - 1, 1);
        const endDate = new Date(year, mon, 0, 23, 59, 59, 999); // Last day of month

        // New policies created this month
        const newPolicies = await prisma.policy.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate }
            },
            include: { client: { select: { name: true } } }
        });

        const newPoliciesCount = newPolicies.length;
        const totalPremium = newPolicies.reduce((sum, p) => sum + p.premium, 0);
        const totalPremiumPaid = newPolicies.reduce((sum, p) => sum + (p.premiumPaid || 0), 0);

        // Renewals due this month
        const renewalsDue = await prisma.renewal.count({
            where: {
                dueDate: { gte: startDate, lte: endDate }
            }
        });

        const renewalsCompleted = await prisma.renewal.count({
            where: {
                dueDate: { gte: startDate, lte: endDate },
                status: 'RENEWED'
            }
        });

        const renewalsLost = await prisma.renewal.count({
            where: {
                dueDate: { gte: startDate, lte: endDate },
                status: 'LOST'
            }
        });

        // Commissions this month
        const commissions: any[] = [];
        const totalCommission = 0;
        const commissionReceived = 0;
        const commissionPending = 0;

        // New clients this month
        const newClientsCount = await prisma.client.count({
            where: {
                createdAt: { gte: startDate, lte: endDate }
            }
        });

        // New leads this month
        const newLeadsCount = await prisma.lead.count({
            where: {
                createdAt: { gte: startDate, lte: endDate }
            }
        });

        const leadsConverted = await prisma.lead.count({
            where: {
                updatedAt: { gte: startDate, lte: endDate },
                status: 'CLOSED_WON'
            }
        });

        // Policy type breakdown
        const policyByType = newPolicies.reduce((acc: Record<string, { count: number; premium: number }>, p) => {
            if (!acc[p.type]) acc[p.type] = { count: 0, premium: 0 };
            acc[p.type].count++;
            acc[p.type].premium += p.premium;
            return acc;
        }, {});

        res.json({
            month,
            summary: {
                newPoliciesCount,
                totalPremium,
                totalPremiumPaid,
                newClientsCount,
                newLeadsCount,
                leadsConverted,
                renewalsDue,
                renewalsCompleted,
                renewalsLost,
                totalCommission,
                commissionReceived,
                commissionPending
            },
            policyByType,
            policies: newPolicies.map(p => ({
                id: p.id,
                policyNo: p.policyNo,
                clientName: (p as any).client?.name,
                type: p.type,
                insurer: p.insurer,
                premium: p.premium,
                premiumPaid: p.premiumPaid,
                status: p.status,
                createdAt: p.createdAt
            }))
        });
    } catch (error) {
        console.error('Error generating monthly report:', error);
        res.status(500).json({ error: 'Failed to generate monthly report' });
    }
};

// Export monthly report as CSV
export const exportMonthlyReport = async (req: Request, res: Response): Promise<void> => {
    try {
        const { month } = req.query;

        if (!month || typeof month !== 'string') {
            res.status(400).json({ error: 'Month parameter is required (format: YYYY-MM)' });
            return;
        }

        const [year, mon] = month.split('-').map(Number);
        const startDate = new Date(year, mon - 1, 1);
        const endDate = new Date(year, mon, 0, 23, 59, 59, 999);

        const policies = await prisma.policy.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            include: { client: { select: { name: true, mobile: true } } }
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="monthly_report_${month}.csv"`);

        let csv = 'Policy No,Client Name,Client Mobile,Type,Insurer,Premium,Premium Paid,Status,Payment Status,Created Date\n';
        policies.forEach((p: any) => {
            csv += `"${p.policyNo}","${p.client?.name || ''}","${p.client?.mobile || ''}","${p.type}","${p.insurer}",${p.premium},${p.premiumPaid || 0},"${p.status}","${p.paymentStatus}","${p.createdAt.toISOString().split('T')[0]}"\n`;
        });

        res.send(csv);
    } catch (error) {
        console.error('Error exporting monthly report:', error);
        res.status(500).json({ error: 'Failed to export monthly report' });
    }
};
