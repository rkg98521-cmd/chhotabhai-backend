import { DeviceModel } from '../models/DeviceModel.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Public: Get all active devices grouped or listed
export const getActiveDevices = asyncHandler(async (req, res) => {
  const { brand, grouped } = req.query;
  const filter = { isActive: true };
  if (brand) {
    filter.brand = new RegExp(`^${brand.trim()}$`, 'i');
  }

  const devices = await DeviceModel.find(filter).sort({ brand: 1, modelName: 1 });

  if (grouped === 'true') {
    const groupedMap = {};
    devices.forEach((d) => {
      if (!groupedMap[d.brand]) groupedMap[d.brand] = [];
      groupedMap[d.brand].push(d.modelName);
    });
    return res.status(200).json(new ApiResponse(200, groupedMap, 'Active phone models grouped by brand retrieved.'));
  }

  res.status(200).json(new ApiResponse(200, devices, 'Active phone models retrieved.'));
});

// Admin: Get all devices (active & inactive)
export const getAllDevices = asyncHandler(async (req, res) => {
  const devices = await DeviceModel.find().sort({ brand: 1, modelName: 1 });
  res.status(200).json(new ApiResponse(200, devices, 'All device models retrieved.'));
});

// Public: Get all active devices grouped by brand
export const getGroupedDevices = asyncHandler(async (req, res) => {
  const devices = await DeviceModel.find({ isActive: true }).sort({ brand: 1, modelName: 1 });
  const groupedMap = {};
  devices.forEach((d) => {
    if (!groupedMap[d.brand]) groupedMap[d.brand] = [];
    groupedMap[d.brand].push(d.modelName);
  });
  return res.status(200).json(new ApiResponse(200, groupedMap, 'Active phone models grouped by brand retrieved.'));
});

// Admin: Create new device model (Single or Bulk)
export const createDevice = asyncHandler(async (req, res) => {
  const body = req.body;

  // Case 1: Bulk array of items: [{ brand, modelName }]
  const rawList = Array.isArray(body)
    ? body
    : Array.isArray(body.devices)
    ? body.devices
    : Array.isArray(body.models) && body.brand
    ? body.models.map((m) => ({ brand: body.brand, modelName: m, isActive: body.isActive }))
    : null;

  if (rawList && rawList.length > 0) {
    const createdItems = [];
    const skippedItems = [];

    for (const item of rawList) {
      const cleanBrand = (item.brand || '').trim();
      const cleanModel = (item.modelName || '').trim();

      if (!cleanBrand || !cleanModel) continue;

      const existing = await DeviceModel.findOne({
        brand: new RegExp(`^${cleanBrand}$`, 'i'),
        modelName: new RegExp(`^${cleanModel}$`, 'i'),
      });

      if (existing) {
        skippedItems.push(`${cleanBrand} ${cleanModel}`);
        continue;
      }

      const newDev = await DeviceModel.create({
        brand: cleanBrand,
        modelName: cleanModel,
        isActive: item.isActive !== false,
      });
      createdItems.push(newDev);
    }

    return res.status(201).json(
      new ApiResponse(
        201,
        { createdCount: createdItems.length, created: createdItems, skipped: skippedItems },
        `Bulk insert completed: ${createdItems.length} created, ${skippedItems.length} duplicate/skipped.`
      )
    );
  }

  // Case 2: Single device model
  const { brand, modelName, isActive } = body;

  if (!brand || !brand.trim() || !modelName || !modelName.trim()) {
    throw new ApiError(400, 'Brand and Model Name are required.');
  }

  const cleanBrand = brand.trim();
  const cleanModel = modelName.trim();

  const existing = await DeviceModel.findOne({
    brand: new RegExp(`^${cleanBrand}$`, 'i'),
    modelName: new RegExp(`^${cleanModel}$`, 'i'),
  });

  if (existing) {
    throw new ApiError(400, `Device model '${cleanBrand} ${cleanModel}' already exists.`);
  }

  const device = await DeviceModel.create({
    brand: cleanBrand,
    modelName: cleanModel,
    isActive: isActive !== false,
  });

  res.status(201).json(new ApiResponse(201, device, 'Device model created successfully.'));
});

// Admin: Toggle device model active status
export const toggleDeviceStatus = asyncHandler(async (req, res) => {
  const device = await DeviceModel.findById(req.params.id);
  if (!device) {
    throw new ApiError(404, 'Device model not found.');
  }

  device.isActive = !device.isActive;
  await device.save();

  res.status(200).json(
    new ApiResponse(
      200,
      device,
      `Device model '${device.modelName}' ${device.isActive ? 'activated' : 'disabled'} successfully.`
    )
  );
});

// Admin: Update device model
export const updateDevice = asyncHandler(async (req, res) => {
  const device = await DeviceModel.findById(req.params.id);
  if (!device) {
    throw new ApiError(404, 'Device model not found.');
  }

  const { brand, modelName, isActive } = req.body;
  if (brand) device.brand = brand.trim();
  if (modelName) device.modelName = modelName.trim();
  if (typeof isActive === 'boolean') device.isActive = isActive;

  await device.save();
  res.status(200).json(new ApiResponse(200, device, 'Device model updated successfully.'));
});

// Admin: Delete device model
export const deleteDevice = asyncHandler(async (req, res) => {
  const device = await DeviceModel.findById(req.params.id);
  if (!device) {
    throw new ApiError(404, 'Device model not found.');
  }

  await DeviceModel.findByIdAndDelete(req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'Device model removed permanently.'));
});

export default {
  getActiveDevices,
  getGroupedDevices,
  getAllDevices,
  createDevice,
  toggleDeviceStatus,
  updateDevice,
  deleteDevice,
};
