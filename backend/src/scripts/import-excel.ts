import { readFileSync } from 'fs';
import * as xlsx from 'xlsx';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function migrateData() {
    console.log('Starting data migration...');

    try {
        // Read the Excel file
        const filePath = '../../Insurance Data (28) (1).xlsx';
        const fileBuffer = readFileSync(filePath);
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to array of arrays to handle unstructured headers
        const data: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`Found ${data.length} rows in the Excel file.`);

        // Skip headers (looks like data starts at row 3 based on preview)
        const rowsToProcess = data.slice(2, 102);
        console.log(`Processing ${rowsToProcess.length} rows as requested...`);

        // Clear existing mock data before importing real data
        console.log('Clearing old data...');
        await prisma.policy.deleteMany({});
        await prisma.client.deleteMany({});

        let successCount = 0;

        for (const row of rowsToProcess) {
            try {
                if (!row || row.length < 5) continue;

                // Expected format from our quick CLI check:
                // row[1] = NO
                // row[2] = NAME
                // row[3] = MOBILE NO
                // row[4] = DATE
                // row[5] = COMPANY (2026 expected)
                // row[6] = PREMIUM (2026 expected)

                const clientName = row[2];
                if (!clientName || clientName === 'NAME' || String(clientName).trim() === '') {
                    continue; // Skip headers or empty rows
                }

                const clientMobile = row[3] ? String(row[3]).trim() : undefined;

                // Create client
                const client = await prisma.client.create({
                    data: {
                        name: String(clientName).trim(),
                        email: undefined,
                        mobile: clientMobile,
                        kycStatus: 'PENDING',
                        notes: 'Imported from Excel',
                    }
                }).catch(async (e) => {
                    if (clientMobile) {
                        return await prisma.client.findFirst({ where: { mobile: clientMobile } });
                    }
                    return await prisma.client.findFirst({ where: { name: String(clientName).trim() } });
                });

                if (!client) continue;

                // Extract policy data
                const policyNo = `MIG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const insurer = row[5] || 'Unknown Insurer';
                const premiumStr = row[6] || '0';
                const premium = parseFloat(String(premiumStr).replace(/,/g, '')) || 0;

                let startDate = new Date();
                let expiryDate = new Date();
                expiryDate.setFullYear(startDate.getFullYear() + 1);

                // Attempt to parse Date column (row[4])
                if (row[4]) {
                    const sd = row[4];
                    if (typeof sd === 'number') startDate = new Date(Math.round((sd - 25569) * 86400 * 1000));
                    else startDate = new Date(String(sd));
                }

                if (isNaN(startDate.getTime())) startDate = new Date();
                expiryDate = new Date(startDate);
                expiryDate.setFullYear(expiryDate.getFullYear() + 1);

                await prisma.policy.create({
                    data: {
                        policyNo,
                        clientId: client.id,
                        type: 'OTHER_GEN',
                        insurer: String(insurer).trim(),
                        premium,
                        startDate,
                        expiryDate,
                        status: 'ACTIVE'
                    }
                });

                successCount++;

            } catch (rowError) {
                console.error(`Error processing row:`, rowError);
            }
        }

        console.log(`Migration complete! Successfully processed and imported ${successCount} actual records.`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrateData();
