import { Router } from 'express';
import { body } from 'express-validator';
import {
  getActiveDevices,
  getGroupedDevices,
  getAllDevices,
  createDevice,
  toggleDeviceStatus,
  updateDevice,
  deleteDevice,
} from '../controllers/deviceController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = Router();

// Public Discovery Routes: GET /api/v1/devices, GET /api/v1/devices/grouped
router.get('/', getActiveDevices);
router.get('/grouped', getGroupedDevices);

// Protected Admin Management Routes
router.use(protect);
router.use(authorize('admin', 'manager'));

router.get('/all', getAllDevices);
router.post('/', createDevice);
router.patch('/:id/toggle', toggleDeviceStatus);
router.put('/:id', updateDevice);
router.delete('/:id', deleteDevice);

export default router;
