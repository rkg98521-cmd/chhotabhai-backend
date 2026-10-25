import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    variantSku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    colorName: {
      type: String,
      trim: true,
      default: '',
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative'],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, 'Total price cannot be negative'],
    },
    selectedDevice: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: true }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: [true, 'Full name is required'], trim: true },
    phone: { type: String, required: [true, 'Phone number is required'], trim: true },
    street: { type: String, required: [true, 'Street address is required'], trim: true },
    landmark: { type: String, trim: true, default: '' },
    city: { type: String, required: [true, 'City is required'], trim: true },
    state: { type: String, required: [true, 'State is required'], trim: true },
    pincode: { type: String, required: [true, 'PIN code is required'], trim: true },
    country: { type: String, default: 'India', trim: true },
  },
  { _id: false }
);

const pricingSummarySchema = new mongoose.Schema(
  {
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const statusTimelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    comment: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    items: [orderItemSchema],
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    pricingSummary: {
      type: pricingSummarySchema,
      required: true,
    },
    couponApplied: {
      code: { type: String, default: null, uppercase: true, trim: true },
      discount: { type: Number, default: 0, min: 0 },
    },
    paymentInfo: {
      method: {
        type: String,
        enum: ['PREPAID_ONLINE', 'RAZORPAY', 'UPI'],
        required: [true, 'Prepaid payment method is required'],
      },
      status: {
        type: String,
        enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
        default: 'PENDING',
      },
      transactionId: {
        type: String,
        trim: true,
        default: null,
      },
      paidAt: {
        type: Date,
        default: null,
      },
    },
    orderStatus: {
      type: String,
      enum: [
        'PAYMENT_PENDING',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
        'REPLACEMENT_REQUESTED',
        'REPLACEMENT_PROCESSING',
        'REPLACED',
      ],
      default: 'PAYMENT_PENDING',
      index: true,
    },
    statusTimeline: [statusTimelineSchema],
    trackingDetails: {
      courierCompany: { type: String, default: '', trim: true },
      trackingNumber: { type: String, default: '', trim: true },
      trackingUrl: { type: String, default: '', trim: true },
    },
    inventoryRestored: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    hasBeenReplaced: {
      type: Boolean,
      default: false,
      index: true,
    },
    replacementDetails: {
      hasRequested: { type: Boolean, default: false },
      requestedAt: { type: Date, default: null },
      reason: { type: String, default: '', trim: true },
      customerNote: { type: String, default: '', trim: true },
      adminComment: { type: String, default: '', trim: true },
      approvedAt: { type: Date, default: null },
      replacedAt: { type: Date, default: null },
      courierCompany: { type: String, default: '', trim: true },
      trackingNumber: { type: String, default: '', trim: true },
      trackingUrl: { type: String, default: '', trim: true },
    },
  },

  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate orderNumber and initialize status timeline
orderSchema.pre('validate', function (next) {
  if (!this.orderNumber) {
    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    this.orderNumber = `ORD-${year}-${randomHex}${timestamp}`;
  }

  // If newly created or status timeline is empty, seed initial timeline
  if (this.isNew && (!this.statusTimeline || this.statusTimeline.length === 0)) {
    this.statusTimeline = [
      {
        status: this.orderStatus || 'PAYMENT_PENDING',
        timestamp: new Date(),
        comment: 'Prepaid order session initiated, awaiting Razorpay confirmation',
      },
    ];
  }
  next();
});

// Compound Indexes for fast dashboard and user querying
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ 'paymentInfo.status': 1 });

// Virtuals for backward compatibility with existing controllers
orderSchema.virtual('totalPrice').get(function () {
  return this.pricingSummary?.grandTotal || 0;
});

orderSchema.virtual('orderItems').get(function () {
  return this.items || [];
});

orderSchema.virtual('isPaid').get(function () {
  return this.paymentInfo?.status === 'PAID';
});

orderSchema.virtual('paymentMethod').get(function () {
  return this.paymentInfo?.method || 'PREPAID_ONLINE';
});


export const Order = mongoose.model('Order', orderSchema);
export default Order;
