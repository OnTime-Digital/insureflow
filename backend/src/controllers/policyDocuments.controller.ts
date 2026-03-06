import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export const getPolicyDocuments = async (req: Request, res: Response) => {
    try {
        const { policyId } = req.query;
        let where: any = {};
        if (policyId) where.policyId = policyId as string;

        const docs = await prisma.document.findMany({
            where,
            include: {
                client: { select: { name: true } },
                policy: { select: { policyNo: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(docs);
    } catch (error) {
        console.error("Get Policy Documents Error:", error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
};

export const uploadPolicyDocument = async (req: Request, res: Response) => {
    try {
        const { policyId, type, url, visibility } = req.body;

        if (!policyId || !type || !url) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get the policy to find the clientId
        const policy = await prisma.policy.findUnique({
            where: { id: policyId },
            select: { clientId: true }
        });

        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        const doc = await prisma.document.create({
            data: {
                clientId: policy.clientId,
                policyId,
                type,
                url,
                customTags: visibility || 'INTERNAL'
            }
        });
        res.status(201).json(doc);
    } catch (error) {
        console.error("Upload Policy Document Error:", error);
        res.status(500).json({ error: 'Failed to save document' });
    }
};

export const deletePolicyDocument = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        await prisma.document.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error("Delete Policy Document Error:", error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
};
