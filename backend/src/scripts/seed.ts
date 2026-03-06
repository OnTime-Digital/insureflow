import 'dotenv/config';
import { PrismaClient } from '../generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function runSeed() {
    console.log('Starting comprehensive seed...');

    // Clear all existing data
    await prisma.activity.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.renewal.deleteMany({});
    await prisma.lead.deleteMany({});
    await prisma.policy.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.user.deleteMany({});
    console.log('Cleared all existing data.');

    // 1. Admin User
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@insureflow.com',
            password: hashedPassword,
            name: 'Admin User',
            role: 'ADMIN',
        }
    });
    console.log(`Created Admin User: ${adminUser.email}`);

    // 2. Clients (10 Indian clients)
    const clientsData = [
        { name: 'Rajiv Sharma', email: 'rajiv.sharma@example.in', mobile: '9876543210', kycStatus: 'Verified', notes: 'HNI Client • Annual income 30L+' },
        { name: 'Priya Patel', email: 'priya.patel@example.in', mobile: '8765432109', kycStatus: 'Pending', notes: 'Referred by Rajiv Sharma' },
        { name: 'Amit Singh', email: 'amit.singh@example.in', mobile: '7654321098', kycStatus: 'Verified', notes: 'Corporate client — IT Sector' },
        { name: 'Sneha Gupta', email: 'sneha.gupta@example.in', mobile: '6543210987', kycStatus: 'Verified', notes: 'Family floater health plan' },
        { name: 'Vikram Reddy', email: 'vikram.reddy@example.in', mobile: '9988776655', kycStatus: 'Rejected', notes: 'Missing PAN card — Follow up needed' },
        { name: 'Ananya Iyer', email: 'ananya.iyer@example.in', mobile: '9123456780', kycStatus: 'Verified', notes: 'NRI client — Dubai based' },
        { name: 'Rohit Mehta', email: 'rohit.mehta@example.in', mobile: '9234567891', kycStatus: 'Pending', notes: 'Walk-in enquiry' },
        { name: 'Kavita Joshi', email: 'kavita.joshi@example.in', mobile: '9345678902', kycStatus: 'Verified', notes: 'Senior citizen — Needs health coverage' },
        { name: 'Deepak Nair', email: 'deepak.nair@example.in', mobile: '9456789013', kycStatus: 'Verified', notes: 'Fleet owner — Multiple vehicle policies' },
        { name: 'Meera Chopra', email: 'meera.chopra@example.in', mobile: '9567890124', kycStatus: 'Pending', notes: 'New customer prospect' },
    ];

    const clients = [];
    for (const data of clientsData) {
        const client = await prisma.client.create({ data });
        clients.push(client);
    }
    console.log(`Created ${clients.length} Clients.`);

    // 3. Policies (15 policies across all types with varying dates)
    const now = new Date();
    const policiesData = [
        // Life policies
        { policyNo: 'LIC-192837', clientId: clients[0].id, type: 'Life', insurer: 'LIC of India', premium: 50000, premiumPaid: 50000, startDate: new Date('2023-01-15'), expiryDate: new Date('2043-01-14'), status: 'ACTIVE' },
        { policyNo: 'ICICI-PRU-1122', clientId: clients[2].id, type: 'Life', insurer: 'ICICI Prudential', premium: 100000, premiumPaid: 75000, startDate: new Date('2021-05-20'), expiryDate: new Date('2051-05-19'), status: 'ACTIVE' },
        { policyNo: 'HDFC-LIFE-3344', clientId: clients[5].id, type: 'Life', insurer: 'HDFC Life', premium: 60000, premiumPaid: 60000, startDate: new Date('2024-03-01'), expiryDate: new Date('2054-02-28'), status: 'ACTIVE' },

        // Health policies
        { policyNo: 'HDFC-HLT-9988', clientId: clients[0].id, type: 'Health', insurer: 'HDFC Ergo', premium: 25000, premiumPaid: 25000, startDate: new Date('2025-06-01'), expiryDate: new Date('2026-05-31'), status: 'ACTIVE' },
        { policyNo: 'MAX-BUPA-5566', clientId: clients[3].id, type: 'Health', insurer: 'Niva Bupa', premium: 18000, premiumPaid: 18000, startDate: new Date('2025-02-01'), expiryDate: new Date('2026-01-31'), status: 'ACTIVE' },
        { policyNo: 'STAR-HLT-7788', clientId: clients[7].id, type: 'Health', insurer: 'Star Health', premium: 32000, premiumPaid: 16000, startDate: new Date('2025-08-15'), expiryDate: new Date('2026-08-14'), status: 'ACTIVE' },
        { policyNo: 'CARE-HLT-4455', clientId: clients[1].id, type: 'Health', insurer: 'Care Health', premium: 15000, premiumPaid: 0, startDate: new Date('2025-11-01'), expiryDate: new Date('2026-10-31'), status: 'PENDING' },

        // Vehicle policies
        { policyNo: 'SBI-MOT-7766', clientId: clients[1].id, type: 'Vehicle', insurer: 'SBI General', premium: 12000, premiumPaid: 12000, startDate: new Date('2025-10-10'), expiryDate: new Date('2026-10-09'), status: 'ACTIVE' },
        { policyNo: 'BJAR-VEH-1100', clientId: clients[8].id, type: 'Vehicle', insurer: 'Bajaj Allianz', premium: 8500, premiumPaid: 8500, startDate: new Date('2025-04-01'), expiryDate: new Date('2026-03-31'), status: 'ACTIVE' },
        { policyNo: 'ICICI-MOT-2233', clientId: clients[8].id, type: 'Vehicle', insurer: 'ICICI Lombard', premium: 9200, premiumPaid: 9200, startDate: new Date('2025-07-15'), expiryDate: new Date('2026-07-14'), status: 'ACTIVE' },
        { policyNo: 'TATA-VEH-9900', clientId: clients[4].id, type: 'Vehicle', insurer: 'Tata AIG', premium: 7500, premiumPaid: 0, startDate: new Date('2024-01-01'), expiryDate: new Date('2025-12-31'), status: 'EXPIRED' },

        // Home policies
        { policyNo: 'IFFCO-HOM-6677', clientId: clients[2].id, type: 'Home', insurer: 'IFFCO Tokio', premium: 22000, premiumPaid: 22000, startDate: new Date('2025-01-01'), expiryDate: new Date('2026-12-31'), status: 'ACTIVE' },

        // Other
        { policyNo: 'CHOLA-TRV-8899', clientId: clients[5].id, type: 'Other', insurer: 'Cholamandalam', premium: 5000, premiumPaid: 5000, startDate: new Date('2025-12-01'), expiryDate: new Date('2026-11-30'), status: 'ACTIVE' },

        // Recently created policies (for monthly chart)
        { policyNo: 'LIC-NEW-0101', clientId: clients[6].id, type: 'Life', insurer: 'LIC of India', premium: 45000, premiumPaid: 22500, startDate: new Date('2026-01-10'), expiryDate: new Date('2046-01-09'), status: 'ACTIVE' },
        { policyNo: 'HDFC-NEW-0202', clientId: clients[9].id, type: 'Health', insurer: 'HDFC Ergo', premium: 20000, premiumPaid: 0, startDate: new Date('2026-02-15'), expiryDate: new Date('2027-02-14'), status: 'PENDING' },
    ];

    const policies = [];
    for (const data of policiesData) {
        const policy = await prisma.policy.create({ data });
        policies.push(policy);
    }
    console.log(`Created ${policies.length} Policies.`);

    // 4. Renewals (policies expiring within next 30 days)
    const renewalsData = [
        { policyId: policies[4].id, dueDate: policies[4].expiryDate, status: 'PAYMENT_PENDING' },
        { policyId: policies[8].id, dueDate: policies[8].expiryDate, status: 'NEW' },
    ];
    for (const data of renewalsData) {
        await prisma.renewal.create({ data });
    }
    console.log(`Created ${renewalsData.length} Renewals.`);

    // 5. Leads (12 leads across all pipeline stages)
    const leadsData = [
        // NEW
        { name: 'Karan Malhotra', email: 'karan.m@example.in', mobile: '9111222333', interestedPolicy: 'Health', status: 'NEW', notes: 'Enquired about family floater plan' },
        { name: 'Divya Kapoor', email: 'divya.k@example.in', mobile: '9222333444', interestedPolicy: 'Life', status: 'NEW', notes: 'Needs term plan — 1 Cr coverage' },
        { name: 'Arjun Verma', mobile: '9333444555', interestedPolicy: 'Vehicle', status: 'NEW', notes: 'New car purchase — comprehensive cover' },

        // CONTACTED
        { name: 'Neha Desai', email: 'neha.d@example.in', mobile: '9444555666', interestedPolicy: 'Life', status: 'CONTACTED', notes: 'Called on 20 Feb, interested in ULIP' },
        { name: 'Suresh Kumar', mobile: '9555666777', interestedPolicy: 'Health', status: 'CONTACTED', notes: 'Wants comparison of Star vs HDFC Ergo' },

        // QUOTE_SENT
        { name: 'Pooja Rao', email: 'pooja.rao@example.in', mobile: '9666777888', interestedPolicy: 'Health', status: 'QUOTE_SENT', notes: 'Quote sent for 10L cover — ₹18,500/yr' },
        { name: 'Manish Tiwari', email: 'manish.t@example.in', mobile: '9777888999', interestedPolicy: 'Life', status: 'QUOTE_SENT', notes: 'ICICI Pru iProtect Smart — ₹12,000/yr quote' },

        // NEGOTIATION
        { name: 'Ritu Saxena', email: 'ritu.s@example.in', mobile: '9888999000', interestedPolicy: 'Home', status: 'NEGOTIATION', notes: 'Wants bundled home + fire coverage, negotiating premium' },
        { name: 'Aakash Jain', mobile: '9000111222', interestedPolicy: 'Vehicle', status: 'NEGOTIATION', notes: 'Fleet discount discussion for 5 vehicles' },

        // CLOSED_WON
        { name: 'Sanjay Bhatt', email: 'sanjay.b@example.in', mobile: '9111000222', interestedPolicy: 'Life', status: 'CLOSED_WON', notes: 'Converted! LIC Jeevan Labh — ₹40,000/yr' },
        { name: 'Lakshmi Menon', email: 'lakshmi.m@example.in', mobile: '9222000333', interestedPolicy: 'Health', status: 'CLOSED_WON', notes: 'Star Comprehensive — Family. Policy issued.' },

        // CLOSED_LOST
        { name: 'Farhan Sheikh', email: 'farhan.s@example.in', mobile: '9333000444', interestedPolicy: 'Vehicle', status: 'CLOSED_LOST', notes: 'Went with competitor — PolicyBazaar online' },
    ];

    for (const data of leadsData) {
        await prisma.lead.create({ data });
    }
    console.log(`Created ${leadsData.length} Leads.`);

    console.log('\n✅ Comprehensive seeding completed successfully!');
    console.log(`   • 1 Admin User (admin@insureflow.com / admin123)`);
    console.log(`   • ${clients.length} Clients`);
    console.log(`   • ${policies.length} Policies`);
    console.log(`   • ${renewalsData.length} Renewals`);
    console.log(`   • ${leadsData.length} Leads`);
}
