import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

// Helper: Calculate end date from start date + tenure type
function calculateEndDate(startDate: Date, tenureType: string, customMonths?: number): { endDate: Date; months: number } {
    const start = new Date(startDate);
    let months = 12; // default YEARLY

    switch (tenureType) {
        case 'MONTHLY': months = 1; break;
        case 'QUARTERLY': months = 3; break;
        case 'HALF_YEARLY': months = 6; break;
        case 'YEARLY': months = 12; break;
        case 'CUSTOM': months = customMonths || 12; break;
        default: months = 12;
    }

    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + months);

    return { endDate, months };
}

// Get all policies
export const getPolicies = async (req: Request, res: Response) => {
    try {
        const { status, type } = req.query;
        let where: any = {};
        if (status) where.status = status;
        if (type) where.type = type;

        const policies = await prisma.policy.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                client: {
                    select: { name: true, email: true }
                }
            }
        });
        res.json(policies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch policies' });
    }
};

// Get single policy
export const getPolicyById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const policy = await prisma.policy.findUnique({
            where: { id },
            include: {
                client: true,
                renewals: true,
                documents: { where: { policyId: id }, orderBy: { createdAt: 'desc' } }
            }
        });

        // Attach policyDocuments alias for frontend compatibility
        if (policy) {
            (policy as any).policyDocuments = policy.documents;
            (policy as any).payments = [];
            (policy as any).commissions = [];
            // Try to load payments and commissions if models exist
            try {
                const payments = await (prisma as any).payment?.findMany({ where: { policyId: id }, orderBy: { date: 'desc' } });
                if (payments) (policy as any).payments = payments;
            } catch (e) { }
            try {
                const commissions = await (prisma as any).commission?.findMany({ where: { policyId: id }, orderBy: { createdAt: 'desc' } });
                if (commissions) (policy as any).commissions = commissions;
            } catch (e) { }
        }

        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        res.json(policy);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch policy' });
    }
};

// Create new policy
export const createPolicy = async (req: Request, res: Response) => {
    try {
        const {
            clientId, type, insurer, policyNo, premium, premiumPaid, status,
            startDate, expiryDate, attachments,
            tenureType, customTenureMonths,
            premiumMode, ppt, pt, vehicleNo, extras, earnedPremium, epAmount,
            notes, referenceId, assignedTo, paymentStatus, paymentTerms, policyTerms,
            remarks, clientVisibleNotes
        } = req.body;

        if (!clientId || !type || !insurer || !premium || !policyNo || !startDate) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        let finalExpiryDate: Date;
        let tenureMonths: number;

        if (tenureType && tenureType !== 'CUSTOM') {
            const calc = calculateEndDate(new Date(startDate), tenureType);
            finalExpiryDate = calc.endDate;
            tenureMonths = calc.months;
        } else if (tenureType === 'CUSTOM' && customTenureMonths) {
            const calc = calculateEndDate(new Date(startDate), 'CUSTOM', parseInt(customTenureMonths));
            finalExpiryDate = calc.endDate;
            tenureMonths = calc.months;
        } else if (expiryDate) {
            finalExpiryDate = new Date(expiryDate);
            const start = new Date(startDate);
            tenureMonths = (finalExpiryDate.getFullYear() - start.getFullYear()) * 12 + (finalExpiryDate.getMonth() - start.getMonth());
        } else {
            const calc = calculateEndDate(new Date(startDate), 'YEARLY');
            finalExpiryDate = calc.endDate;
            tenureMonths = calc.months;
        }

        // Build extras JSON from type-specific fields + any passed extras
        let extrasData: any = {};
        if (extras && typeof extras === 'object') {
            extrasData = extras;
        } else if (extras && typeof extras === 'string') {
            try { extrasData = JSON.parse(extras); } catch (e) { }
        }
        // Store additional terms in extras
        if (paymentTerms) extrasData.paymentTerms = paymentTerms;
        if (policyTerms) extrasData.policyTerms = policyTerms;
        if (remarks) extrasData.remarks = remarks;
        if (clientVisibleNotes) extrasData.clientVisibleNotes = clientVisibleNotes;

        const newPolicy = await prisma.policy.create({
            data: {
                clientId,
                type,
                insurer,
                policyNo,
                premium: parseFloat(premium),
                premiumPaid: premiumPaid !== undefined && premiumPaid !== null ? parseFloat(premiumPaid) : 0,
                paymentStatus: paymentStatus || 'UNPAID',
                premiumMode: premiumMode || null,
                status: status || 'ACTIVE',
                startDate: new Date(startDate),
                expiryDate: finalExpiryDate,
                attachments,
                tenureType: tenureType || null,
                tenureMonths,
                customTenureMonths: tenureType === 'CUSTOM' ? (parseInt(customTenureMonths) || null) : null,
                nextRenewalDate: finalExpiryDate,
                vehicleNo: vehicleNo || null,
                extras: Object.keys(extrasData).length > 0 ? JSON.stringify(extrasData) : null,
                earnedPremium: earnedPremium ? parseFloat(earnedPremium) : null,
                epAmount: epAmount ? parseFloat(epAmount) : null,
                ppt: ppt ? parseInt(ppt) : null,
                pt: pt ? parseInt(pt) : null,
                notes: notes || null,
                referenceId: referenceId || null,
                assignedTo: assignedTo || null,
            },
            include: { client: true }
        });

        res.status(201).json(newPolicy);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'A policy with this number already exists for this client.' });
        }
        console.error("Create Policy Error:", error);
        res.status(500).json({ error: 'Failed to create policy' });
    }
};

// Update policy
export const updatePolicy = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const {
            type, insurer, policyNo, premium, premiumPaid, status,
            startDate, expiryDate, attachments,
            tenureType, customTenureMonths,
            premiumMode, ppt, pt, vehicleNo, extras, earnedPremium, epAmount,
            notes, referenceId, assignedTo, paymentStatus, paymentTerms, policyTerms,
            remarks, clientVisibleNotes
        } = req.body;

        let data: any = {
            type,
            insurer,
            policyNo,
            premium: premium !== undefined ? parseFloat(premium) : undefined,
            premiumPaid: premiumPaid !== undefined && premiumPaid !== null ? parseFloat(premiumPaid) : undefined,
            paymentStatus: paymentStatus || undefined,
            premiumMode: premiumMode !== undefined ? premiumMode : undefined,
            status,
            attachments,
            vehicleNo: vehicleNo !== undefined ? vehicleNo : undefined,
            earnedPremium: earnedPremium !== undefined ? (earnedPremium ? parseFloat(earnedPremium) : null) : undefined,
            epAmount: epAmount !== undefined ? (epAmount ? parseFloat(epAmount) : null) : undefined,
            ppt: ppt !== undefined ? (ppt ? parseInt(ppt) : null) : undefined,
            pt: pt !== undefined ? (pt ? parseInt(pt) : null) : undefined,
            notes: notes !== undefined ? notes : undefined,
            referenceId: referenceId !== undefined ? (referenceId || null) : undefined,
            assignedTo: assignedTo !== undefined ? (assignedTo || null) : undefined,
        };

        // Handle extras
        if (extras !== undefined) {
            let extrasData: any = {};
            if (extras && typeof extras === 'object') extrasData = extras;
            else if (extras && typeof extras === 'string') { try { extrasData = JSON.parse(extras); } catch (e) { } }
            if (paymentTerms) extrasData.paymentTerms = paymentTerms;
            if (policyTerms) extrasData.policyTerms = policyTerms;
            if (remarks) extrasData.remarks = remarks;
            if (clientVisibleNotes) extrasData.clientVisibleNotes = clientVisibleNotes;
            data.extras = Object.keys(extrasData).length > 0 ? JSON.stringify(extrasData) : null;
        }

        // Recalculate dates if tenure info provided
        if (tenureType && startDate) {
            if (tenureType !== 'CUSTOM') {
                const calc = calculateEndDate(new Date(startDate), tenureType);
                data.startDate = new Date(startDate);
                data.expiryDate = calc.endDate;
                data.tenureType = tenureType;
                data.tenureMonths = calc.months;
                data.customTenureMonths = null;
                data.nextRenewalDate = calc.endDate;
            } else if (customTenureMonths) {
                const calc = calculateEndDate(new Date(startDate), 'CUSTOM', parseInt(customTenureMonths));
                data.startDate = new Date(startDate);
                data.expiryDate = calc.endDate;
                data.tenureType = 'CUSTOM';
                data.tenureMonths = calc.months;
                data.customTenureMonths = parseInt(customTenureMonths);
                data.nextRenewalDate = calc.endDate;
            } else if (expiryDate) {
                data.startDate = new Date(startDate);
                data.expiryDate = new Date(expiryDate);
                data.tenureType = 'CUSTOM';
                const start = new Date(startDate);
                const end = new Date(expiryDate);
                data.tenureMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
                data.nextRenewalDate = new Date(expiryDate);
            }
        } else {
            if (startDate) data.startDate = new Date(startDate);
            if (expiryDate) data.expiryDate = new Date(expiryDate);
        }

        // Remove undefined values
        Object.keys(data).forEach(key => {
            if (data[key] === undefined) delete data[key];
        });

        const updatedPolicy = await prisma.policy.update({
            where: { id },
            data,
            include: { client: true }
        });

        res.json(updatedPolicy);
    } catch (error) {
        console.error("Update Policy Error:", error);
        res.status(500).json({ error: 'Failed to update policy' });
    }
};

// Delete policy
export const deletePolicy = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        await prisma.policy.delete({
            where: { id },
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete policy' });
    }
};

export const exportPolicies = async (req: Request, res: Response): Promise<void> => {
    try {
        const policies = await prisma.policy.findMany({
            include: { client: true }
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="policies_export.csv"');

        let csv = 'ID,Policy No,Client Name,Type,Insurer,Premium,Status,Start Date,Expiry Date,Tenure Type,Tenure Months\n';
        policies.forEach((p: any) => {
            csv += `"${p.id}","${p.policyNo}","${p.client?.name || ''}","${p.type}","${p.insurer}",${p.premium},"${p.status}","${p.startDate.toISOString().split('T')[0]}","${p.expiryDate.toISOString().split('T')[0]}","${p.tenureType || ''}",${p.tenureMonths || ''}\n`;
        });

        res.send(csv);
    } catch (error) {
        console.error("Export Policies Error:", error);
        res.status(500).json({ error: "Failed to export policies" });
    }
};

import xlsx from 'xlsx';

export const importPolicies = async (req: Request, res: Response): Promise<void> => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: "No file uploaded" });
            return;
        }

        const workbook = xlsx.readFile(file.path);
        const sheetNameList = workbook.SheetNames;
        const xlData: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]], { header: 1 });

        let policiesCreated = 0;

        // Loop through starting at row 3 (index 2)
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
                    // Fallback to name search
                    client = await prisma.client.findFirst({ where: { name } });
                }

                if (!client) {
                    // If no client exists, skip their policies to avoid orphans
                    continue;
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
                                    expiryDate: expiryDate,
                                    tenureType: 'YEARLY',
                                    tenureMonths: 12,
                                    nextRenewalDate: expiryDate
                                }
                            });
                            policiesCreated++;
                        }
                    }
                }
            } catch (e: any) {
                console.error(`Error processing policies on row ${i} (${name}): ${e.message}`);
            }
        }

        res.status(200).json({ message: `Successfully imported ${policiesCreated} policies.` });
    } catch (error) {
        console.error("Import Policies Error:", error);
        res.status(500).json({ error: "Failed to process policies file" });
    }
};

export const importPoliciesJson = async (req: Request, res: Response): Promise<void> => {
    try {
        const { policies } = req.body;
        if (!policies || !Array.isArray(policies)) {
            res.status(400).json({ error: "Invalid data format" });
            return;
        }

        let createdCount = 0;
        for (const data of policies) {
            try {
                if (!data.clientName || !data.insurer || !data.premium) continue;

                // Find client by name
                const client = await prisma.client.findFirst({
                    where: { name: { contains: data.clientName } }
                });

                if (client) {
                    const policyNo = data.policyNo || `POL-MOCK-${new Date().getFullYear()}-${client.id.substring(0, 4).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
                    const startDate = data.startDate ? new Date(data.startDate) : new Date();
                    const expiryDate = data.expiryDate ? new Date(data.expiryDate) : new Date(new Date().setFullYear(new Date().getFullYear() + 1));

                    await prisma.policy.create({
                        data: {
                            clientId: client.id,
                            type: data.type || 'Health/Vehicle',
                            insurer: data.insurer,
                            policyNo: policyNo,
                            premium: parseFloat(data.premium) || 0,
                            status: new Date(expiryDate) > new Date() ? 'ACTIVE' : 'EXPIRED',
                            startDate,
                            expiryDate,
                            tenureType: 'YEARLY',
                            tenureMonths: 12,
                            nextRenewalDate: expiryDate
                        }
                    });
                    createdCount++;
                }
            } catch (err) {
                console.error("Error creating policy from JSON import:", err);
            }
        }
        res.status(200).json({ message: `Successfully imported ${createdCount} policies.` });
    } catch (error) {
        console.error("Import JSON Error:", error);
        res.status(500).json({ error: "Failed to import policies from JSON" });
    }
};
