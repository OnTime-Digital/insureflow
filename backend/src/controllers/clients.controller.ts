import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

// Get all clients (paginated)
export const getClients = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 25;
        const search = (req.query.search as string) || '';
        const sortBy = (req.query.sortBy as string) || 'createdAt';
        const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { email: { contains: search } },
                { mobile: { contains: search } },
            ];
        }

        const orderBy: any = {};
        if (sortBy === 'name') orderBy.name = sortOrder;
        else orderBy.createdAt = sortOrder;

        const total = await prisma.client.count({ where });
        const totalPages = Math.ceil(total / limit);

        const clients = await prisma.client.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                policies: {
                    select: { id: true, status: true, expiryDate: true }
                },
                _count: {
                    select: { policies: true }
                }
            }
        });

        // Compute active policy count and next renewal date
        const enrichedClients = clients.map(client => {
            const activePolicies = client.policies.filter(p => p.status === 'ACTIVE');
            const now = new Date();
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            const upcomingExpiryDates = activePolicies
                .map(p => p.expiryDate)
                .filter(d => d > now)
                .sort((a, b) => a.getTime() - b.getTime());

            const nextRenewalDate = upcomingExpiryDates.length > 0 ? upcomingExpiryDates[0] : null;
            const renewalUrgent = nextRenewalDate ? nextRenewalDate <= thirtyDaysFromNow : false;

            const { policies, ...clientWithoutPolicies } = client;
            return {
                ...clientWithoutPolicies,
                activePolicyCount: activePolicies.length,
                nextRenewalDate,
                renewalUrgent,
            };
        });

        res.json({
            data: enrichedClients,
            pagination: { page, limit, total, totalPages }
        });
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
};

// Get single client by ID
export const getClientById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                policies: true,
                documents: true
            }
        });

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json(client);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch client' });
    }
};

// Create new client
export const createClient = async (req: Request, res: Response) => {
    try {
        const { name, email, mobile, notes, referenceId } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required.' });
        }

        const newClient = await prisma.client.create({
            data: { name, email, mobile, notes, referenceId },
        });

        res.status(201).json(newClient);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'A client with this email or mobile already exists.' });
        }
        res.status(500).json({ error: 'Failed to create client' });
    }
};

// Update existing client
export const updateClient = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { name, email, mobile, notes, referenceId } = req.body;

        const updatedClient = await prisma.client.update({
            where: { id },
            data: { name, email, mobile, notes, referenceId },
        });

        res.json(updatedClient);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update client' });
    }
};

// Delete client
export const deleteClient = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        await prisma.client.delete({
            where: { id },
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete client' });
    }
};

// Bulk delete clients
export const bulkDeleteClients = async (req: Request, res: Response) => {
    try {
        const { clientIds } = req.body;
        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
            return res.status(400).json({ error: 'An array of client IDs is required.' });
        }

        await prisma.client.deleteMany({
            where: {
                id: { in: clientIds },
            },
        });

        res.status(204).send();
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ error: 'Failed to bulk delete clients' });
    }
};

export const exportClients = async (req: Request, res: Response): Promise<void> => {
    try {
        const clients = await prisma.client.findMany({
            include: { policies: true }
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="clients_export.csv"');

        let csv = 'ID,Name,Email,Mobile,Notes,Total Policies\n';
        clients.forEach((c: any) => {
            csv += `"${c.id}","${c.name}","${c.email || ''}","${c.mobile || ''}","${c.notes || ''}",${c.policies.length}\n`;
        });

        res.send(csv);
    } catch (error) {
        console.error("Export Clients Error:", error);
        res.status(500).json({ error: "Failed to export clients" });
    }
};

const xlsx = require('xlsx');

export const importClients = async (req: Request, res: Response): Promise<void> => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: "No file uploaded" });
            return;
        }

        const workbook = xlsx.readFile(file.path);
        const sheetNameList = workbook.SheetNames;
        const xlData: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]], { header: 1 });

        let clientsCreated = 0;
        let policiesCreated = 0;

        for (let i = 2; i < xlData.length; i++) {
            const row = xlData[i];
            if (!row || row.length === 0) continue;

            let nameRaw = row[2];
            if (!nameRaw) continue;
            const name = nameRaw.toString().trim();
            if (!name) continue;

            let mobile = row[3] ? row[3].toString().trim() : null;

            try {
                let client;
                if (mobile) {
                    client = await prisma.client.findFirst({ where: { mobile } });
                }
                if (!client) {
                    client = await prisma.client.create({
                        data: {
                            name: name,
                            mobile: mobile,
                            notes: "Mock data from Excel"
                        }
                    });
                    clientsCreated++;
                }

                const yearMappings = [
                    { year: 2026, colComp: 6, colPrem: 7 },
                    { year: 2025, colComp: 8, colPrem: 9 },
                    { year: 2024, colComp: 10, colPrem: 11 },
                    { year: 2023, colComp: 12, colPrem: 13 },
                    { year: 2022, colComp: 14, colPrem: 15 },
                    { year: 2021, colComp: 16, colPrem: 17 }
                ];

                for (const mapping of yearMappings) {
                    const company = row[mapping.colComp];
                    let premiumStr = row[mapping.colPrem];

                    if (company && typeof company === 'string' && company.toUpperCase() !== 'NA' && premiumStr) {
                        let premium = parseFloat(premiumStr);
                        if (!isNaN(premium) && premium > 0) {
                            const startDate = new Date(`${mapping.year}-01-01`);
                            const expiryDate = new Date(`${mapping.year}-12-31`);
                            const isFuture = mapping.year >= 2025;

                            await prisma.policy.create({
                                data: {
                                    clientId: client.id,
                                    type: 'Health/Vehicle',
                                    insurer: company.trim(),
                                    policyNo: `POL-MOCK-${mapping.year}-${client.id.substring(0, 4).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
                                    premium: premium,
                                    status: isFuture ? 'ACTIVE' : 'EXPIRED',
                                    startDate: startDate,
                                    expiryDate: expiryDate
                                }
                            });
                            policiesCreated++;
                        }
                    }
                }
            } catch (e: any) {
                console.error(`Error on row ${i} (${name}): ${e.message}`);
            }
        }

        res.status(200).json({ message: `Successfully imported ${clientsCreated} clients and ${policiesCreated} policies.` });
    } catch (error) {
        console.error("Import Clients Error:", error);
        res.status(500).json({ error: "Failed to process import file" });
    }
};

export const importClientsJson = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clients } = req.body;
        if (!clients || !Array.isArray(clients)) {
            res.status(400).json({ error: "Invalid data format" });
            return;
        }

        let createdCount = 0;
        for (const data of clients) {
            try {
                let existing = null;
                if (data.mobile) {
                    existing = await prisma.client.findFirst({ where: { mobile: data.mobile } });
                }
                if (!existing) {
                    await prisma.client.create({
                        data: {
                            name: data.name,
                            email: data.email || null,
                            mobile: data.mobile || null,
                            kycStatus: data.kycStatus || 'Pending',
                            notes: data.notes || ''
                        }
                    });
                    createdCount++;
                }
            } catch (err) {
                console.error("Error creating client from JSON import:", err);
            }
        }
        res.status(200).json({ message: `Successfully imported ${createdCount} clients.` });
    } catch (error) {
        console.error("Import JSON Error:", error);
        res.status(500).json({ error: "Failed to import clients from JSON" });
    }
};
