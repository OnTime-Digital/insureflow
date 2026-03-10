import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

// Get all leads with filters
export const getLeads = async (req: Request, res: Response) => {
    try {
        const { status, search } = req.query;
        const where: any = {};

        if (status) where.status = status as string;
        if (search && typeof search === 'string' && search.trim()) {
            const s = search.trim();
            where.OR = [
                { name: { contains: s } },
                { email: { contains: s } },
                { mobile: { contains: s } }
            ];
        }

        const leads = await prisma.lead.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
        });
        res.json(leads);
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
};

// Create new lead
export const createLead = async (req: Request, res: Response) => {
    try {
        const { name, email, mobile, interestedPolicy, status, notes } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required to create a lead.' });
        }

        const newLead = await prisma.lead.create({
            data: {
                name,
                email: email || null,
                mobile: mobile || null,
                interestedPolicy: interestedPolicy || null,
                status: status || 'NEW',
                notes: notes || null,
            },
        });

        res.status(201).json(newLead);
    } catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({ error: 'Failed to create lead' });
    }
};

// Update lead status/details
export const updateLead = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { name, email, mobile, interestedPolicy, status, notes } = req.body;

        const updatedLead = await prisma.lead.update({
            where: { id },
            data: {
                name,
                email,
                mobile,
                interestedPolicy,
                status,
                notes,
            },
        });

        res.json(updatedLead);
    } catch (error) {
        console.error('Error updating lead:', error);
        res.status(500).json({ error: 'Failed to update lead' });
    }
};

// Delete lead
export const deleteLead = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        await prisma.lead.delete({
            where: { id },
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete lead' });
    }
};

// Bulk delete leads
export const bulkDeleteLeads = async (req: Request, res: Response) => {
    try {
        const { leadIds } = req.body;
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ error: 'An array of lead IDs is required.' });
        }

        await prisma.lead.deleteMany({
            where: {
                id: { in: leadIds },
            },
        });

        res.status(204).send();
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ error: 'Failed to bulk delete leads' });
    }
};

// Bulk update lead status
export const bulkUpdateLeadStatus = async (req: Request, res: Response) => {
    try {
        const { leadIds, status } = req.body;
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0 || !status) {
            return res.status(400).json({ error: 'Lead IDs array and status are required.' });
        }

        await prisma.lead.updateMany({
            where: {
                id: { in: leadIds },
            },
            data: { status }
        });

        res.status(200).json({ message: 'Leads status updated successfully' });
    } catch (error) {
        console.error('Bulk status update error:', error);
        res.status(500).json({ error: 'Failed to update leads status' });
    }
};

// Get lead activities
export const getLeadActivities = async (req: Request, res: Response) => {
    try {
        const leadId = req.params.id as string;
        const activities = await prisma.activity.findMany({
            where: { id: leadId }, // We use id for now because leadId relation isn't there
            include: {
                user: {
                    select: { name: true }
                }
            },
        });
        res.json(activities);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch lead activities' });
    }
};

// Add activity to lead
export const addLeadActivity = async (req: Request, res: Response) => {
    try {
        const leadId = req.params.id as string;
        const { type, notes, userId } = req.body;

        if (!notes || !userId) {
            return res.status(400).json({ error: 'Notes and userId are required' });
        }

        const activity = await prisma.activity.create({
            data: {
                // The instruction states Activity schema has userId and renewalId, NO leadId.
                // If activities are meant to be associated with leads, and there's no direct 'leadId' field
                // in the Activity model, then the relation needs to be handled differently.
                // For example, if Lead has a relation to Activity, you might create it like:
                // lead: { connect: { id: leadId } },
                // Or if Activity is meant to be standalone or related to something else,
                // then 'leadId' should not be part of its creation data.
                // Given the instruction "NO leadId" in Activity schema, we remove it from data.
                userId,
                type: type || 'NOTE',
                notes,
            },
            include: {
                user: { select: { name: true } }
            }
        });

        res.status(201).json(activity);
    } catch (error) {
        console.error('Error adding lead activity:', error);
        res.status(500).json({ error: 'Failed to add activity' });
    }
};
