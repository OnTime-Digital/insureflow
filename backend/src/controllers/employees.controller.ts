import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Get all employees/users
export const getEmployees = async (req: Request, res: Response) => {
    try {
        const { search, role, isActive } = req.query;
        const where: any = {};

        if (search && typeof search === 'string' && search.trim()) {
            const s = search.trim();
            where.OR = [
                { name: { contains: s } },
                { email: { contains: s } }
            ];
        }

        if (role) where.role = role as string;

        const employees = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                _count: {
                    select: {
                        activities: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        res.json(employees);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
};

// Get single employee
export const getEmployeeById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const employee = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                _count: {
                    select: {
                        activities: true
                    }
                }
            }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json(employee);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch employee' });
    }
};

// Create employee
export const createEmployee = async (req: Request, res: Response) => {
    try {
        const { name, email, password, mobile, role, joiningDate, permissions } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }

        // Check for duplicate email
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'An employee with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newEmployee = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'STAFF',
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        });

        res.status(201).json(newEmployee);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'An employee with this email already exists.' });
        }
        console.error('Error creating employee:', error);
        res.status(500).json({ error: 'Failed to create employee' });
    }
};

// Update employee
export const updateEmployee = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { name, email, mobile, role, joiningDate, permissions, password } = req.body;

        const data: any = {};
        if (name !== undefined) data.name = name;
        if (email !== undefined) data.email = email;
        if (role !== undefined) data.role = role;
        if (password) data.password = await bcrypt.hash(password, 10);

        const updated = await prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Failed to update employee' });
    }
};

// Toggle active/inactive with optional reassignment
export const toggleEmployee = async (req: Request, res: Response) => {
    res.status(501).json({ error: 'Toggle employee not implemented (requires isActive field)' });
};

// Reset password (Admin/Manager forcing a reset)
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword },
        });

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};
