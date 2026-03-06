import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

// Get all settings as key-value map
export const getSettings = async (req: Request, res: Response) => {
    try {
        const settings = await prisma.setting.findMany();
        const settingsMap: Record<string, string> = {};
        settings.forEach(s => {
            settingsMap[s.key] = s.value;
        });
        res.json(settingsMap);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

// Update/create multiple settings at once (upsert)
export const updateSettings = async (req: Request, res: Response) => {
    try {
        const settingsData = req.body;

        // Support both { key, value } single-pair and { key1: value1, key2: value2 } batch formats
        if (settingsData.key && settingsData.value !== undefined) {
            // Single pair format from frontend
            await prisma.setting.upsert({
                where: { key: settingsData.key },
                update: { value: settingsData.value },
                create: { key: settingsData.key, value: settingsData.value }
            });
        } else {
            // Batch format: { key1: value1, key2: value2 }
            const entries = Object.entries(settingsData);
            for (const [key, value] of entries) {
                await prisma.setting.upsert({
                    where: { key },
                    update: { value: String(value) },
                    create: { key, value: String(value) }
                });
            }
        }

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

// Get only branding-related settings
export const getBranding = async (req: Request, res: Response) => {
    try {
        const brandingKeys = ['app_name', 'company_name', 'logo_url', 'favicon_url', 'primary_color', 'report_footer_text'];
        const settings = await prisma.setting.findMany({
            where: { key: { in: brandingKeys } }
        });
        const brandingMap: Record<string, string> = {};
        settings.forEach(s => {
            brandingMap[s.key] = s.value;
        });
        res.json(brandingMap);
    } catch (error) {
        console.error('Error fetching branding:', error);
        res.status(500).json({ error: 'Failed to fetch branding settings' });
    }
};
