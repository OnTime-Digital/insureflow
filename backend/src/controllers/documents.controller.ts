import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { logActivity } from '../utils/audit';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Get all documents
export const getDocuments = async (req: Request, res: Response) => {
    try {
        const { type, search } = req.query;
        let where: any = {};
        if (type) where.type = type;
        if (search) {
            where.OR = [
                { type: { contains: search as string } },
                { customTags: { contains: search as string } },
                { originalName: { contains: search as string } },
                { client: { name: { contains: search as string } } },
                { policy: { policyNo: { contains: search as string } } }
            ];
        }

        const documents = await prisma.document.findMany({
            where,
            include: {
                client: {
                    select: {
                        name: true,
                    },
                },
                policy: {
                    select: {
                        policyNo: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json(documents);
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
};

// Get a single document by ID
export const getDocumentById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const document = await prisma.document.findUnique({
            where: { id },
            include: {
                client: {
                    select: {
                        name: true,
                    },
                },
                policy: {
                    select: {
                        policyNo: true,
                    },
                },
            },
        });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        res.json(document);
    } catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({ error: 'Failed to fetch document' });
    }
};

// Create a new document
export const createDocument = async (req: Request, res: Response) => {
    try {
        const { clientId, policyId, type, url, customTags, originalName, storedName, mimeType, fileSize } = req.body;

        if (!clientId || !type || !url) {
            return res.status(400).json({ error: 'clientId, type, and url are required fields' });
        }

        const newDocument = await prisma.document.create({
            data: {
                clientId,
                policyId: policyId || null,
                type,
                url,
                originalName: originalName || null,
                storedName: storedName || null,
                mimeType: mimeType || null,
                fileSize: fileSize ? parseInt(fileSize) : null,
                customTags,
            },
            include: {
                client: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // Audit Log
        if ((req as any).user?.id) {
            await logActivity((req as any).user.id, 'CREATE', 'DOCUMENT', newDocument.id, { type: newDocument.type, customTags: newDocument.customTags });
        }

        res.status(201).json(newDocument);
    } catch (error: any) {
        console.error('Error creating document:', error);
        res.status(400).json({ error: error.message || 'Failed to create document' });
    }
};

// Force download a document
export const downloadDocument = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const document = await prisma.document.findUnique({ where: { id } });

        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // The url is stored as /uploads/filename
        const filePath = path.join(process.cwd(), document.url);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        const downloadName = document.originalName || path.basename(document.url);
        res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
        if (document.mimeType) {
            res.setHeader('Content-Type', document.mimeType);
        }

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).json({ error: 'Failed to download document' });
    }
};

// Delete a document
export const deleteDocument = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        await prisma.document.delete({
            where: { id },
        });

        // Audit Log
        if ((req as any).user?.id) {
            await logActivity((req as any).user.id, 'DELETE', 'DOCUMENT', id);
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
};
