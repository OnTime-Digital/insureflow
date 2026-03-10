import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from './generated/prisma';
import path from 'path';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5005;

// Middleware
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(morgan('dev'));
app.use(express.json());

// Route imports
import dashboardRoutes from './routes/dashboard.routes';
import clientsRoutes from './routes/clients.routes';
import policiesRoutes from './routes/policies.routes';
import leadsRoutes from './routes/leads.routes';
import uploadRoutes from './routes/upload.routes';
import documentsRoutes from './routes/documents.routes';
import authRoutes from './routes/auth.routes';
import renewalsRoutes from './routes/renewals.routes';
import employeesRoutes from './routes/employees.routes';
import settingsRoutes from './routes/settings.routes';
import paymentsRoutes from './routes/payments.routes';
import commissionsRoutes from './routes/commissions.routes';
import referencesRoutes from './routes/references.routes';
import activitiesRoutes from './routes/activities.routes';
import auditRoutes from './routes/audit.routes';
import monthlyReportsRoutes from './routes/monthly-reports.routes';
import policyDocumentsRoutes from './routes/policyDocuments.routes';
import { runSeed } from './scripts/seed';

// Basic Health Check Route
app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', message: 'Backend is running correctly.' });
});

app.get('/api/seed', async (req: Request, res: Response) => {
    try {
        await runSeed();
        res.status(200).json({ message: 'Seeding completed successfully!' });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Error during seeding', error: error.message });
    }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/policies', policiesRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/renewals', renewalsRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/commissions', commissionsRoutes);
app.use('/api/references', referencesRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/monthly-reports', monthlyReportsRoutes);
app.use('/api/policy-documents', policyDocumentsRoutes);

// Static uploads serving with explicit CORS
app.use('/uploads', cors(), express.static(path.join(process.cwd(), 'uploads'), {
    setHeaders: (res, filePath) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
