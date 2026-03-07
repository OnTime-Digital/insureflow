import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

// Get all references
export const getReferences = async (req: Request, res: Response) => {
    try {
        const { search, type, status } = req.query;

        const where: any = {};
        if (type) where.type = type as string;
        if (status) where.status = status as string;
        if (search) {
            const s = String(search).trim();
            where.OR = [
                { name: { contains: s } },
                { contact: { contains: s } },
                { code: { contains: s } }
            ];
        }

        const references = await prisma.reference.findMany({
            where,
            orderBy: { name: 'asc' }
        });

        res.json(references);
    } catch (error) {
        console.error('Error fetching references:', error);
        res.status(500).json({ error: 'Failed to fetch references' });
    }
};

// Create reference
export const createReference = async (req: Request, res: Response) => {
    try {
        const { type, name, contact, status } = req.body;

        if (!type || !name) {
            return res.status(400).json({ error: 'Type and name are required' });
        }

        const typeStr = type as string;

        // Generate a unique referral code
        const codePrefix = typeStr.substring(0, 3).toUpperCase();
        const codeNum = Math.floor(1000 + Math.random() * 9000);
        const code = `${codePrefix}${codeNum}`;

        const newRef = await prisma.reference.create({
            data: {
                type,
                name: name.trim(),
                contact: contact?.trim() || null,
                status: status || 'ACTIVE',
                code
            }
        });

        res.status(201).json(newRef);
    } catch (error) {
        console.error('Error creating reference:', error);
        res.status(500).json({ error: 'Failed to create reference' });
    }
};

// Update reference
export const updateReference = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { type, name, contact, status } = req.body;

        const updatedRef = await prisma.reference.update({
            where: { id },
            data: {
                type,
                name: name?.trim(),
                contact: contact?.trim() || null,
                status
            }
        });

        res.json(updatedRef);
    } catch (error) {
        console.error('Error updating reference:', error);
        res.status(500).json({ error: 'Failed to update reference' });
    }
};

// Delete reference
export const deleteReference = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        await prisma.reference.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting reference:', error);
        res.status(500).json({ error: 'Failed to delete reference' });
    }
};
