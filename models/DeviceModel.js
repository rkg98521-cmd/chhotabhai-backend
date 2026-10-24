import mongoose from 'mongoose';

const deviceModelSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: [true, 'Device brand is required (e.g. Apple, Samsung, OnePlus, Google)'],
      trim: true,
      index: true,
    },
    modelName: {
      type: String,
      required: [true, 'Device model name is required (e.g. iPhone 15 Pro, Galaxy S24 Ultra)'],
      trim: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique brand and model name
deviceModelSchema.index({ brand: 1, modelName: 1 }, { unique: true });

export const DeviceModel = mongoose.model('DeviceModel', deviceModelSchema);
export default DeviceModel;
