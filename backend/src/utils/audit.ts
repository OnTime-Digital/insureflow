import { PrismaClient } from '../generated/prisma';
const prisma = new PrismaClient();

/**
 * Helper function to log activities to the AuditLog table.
 * 
 * @param userId - ID of the user performing the action
 * @param action - The action performed (e.g., CREATE, UPDATE, DELETE, UPLOAD, LOGIN)
 * @param entityType - The type of entity affected (e.g., CLIENT, POLICY, RENEWAL, DOCUMENT, AUTH)
 * @param entityId - The ID of the affected entity
 * @param details - Optional JSON object containing extra details to be stringified
 */
export const logActivity = async (
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    details?: Record<string, any>
) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                entityType,
                entityId,
                details: details ? JSON.stringify(details) : null,
            },
        });
    } catch (error) {
        console.error('Failed to log activity:', error);
        // We intentionally don't throw here so that audit log failures don't 
        // break the main application flow.
    }
};
