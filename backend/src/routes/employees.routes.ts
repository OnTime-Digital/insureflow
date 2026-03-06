import { Router } from 'express';
import {
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    toggleEmployee,
    resetPassword
} from '../controllers/employees.controller';

const router = Router();

router.get('/', getEmployees);
router.get('/:id', getEmployeeById);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.put('/:id/toggle', toggleEmployee);
router.put('/:id/reset-password', resetPassword);

export default router;
