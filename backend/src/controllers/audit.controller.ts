import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

// Get all audit logs with pagination and optional filtering
export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const {
            page = '1',
            limit = '50',
            entityType,
            action,
            userId
        } = req.query;

        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
        const skip = (pageNum - 1) * limitNum;

        let where: any = {};

        if (entityType) {
            where.entityType = entityType as string;
        }

        if (action) {
            where.action = action as string;
        }

        if (userId) {
            where.userId = userId as string;
        }

        const [auditLogs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    user: {
                        select: {
                            name: true,
                            role: true,
                            email: true
                        }
                    }
                }
            }),
            prisma.auditLog.count({ where })
        ]);

        res.json({
            data: auditLogs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
};
