import mongoose from 'mongoose';

const bannerOfferSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Banner title / Announcement alert is required'],
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    redirectUrl: {
      type: String,
      trim: true,
      default: '/shop',
    },
    linkUrl: {
      type: String,
      trim: true,
      default: '/shop',
    },
    badgeText: {
      type: String,
      trim: true,
      default: 'PREPAID DEAL',
    },
    badge: {
      type: String,
      trim: true,
      default: 'PREPAID DEAL',
    },
    ctaText: {
      type: String,
      trim: true,
      default: 'Shop Now',
    },
    bannerMode: {
      type: String,
      enum: ['TEXT_OVERLAY', 'FULL_IMAGE'],
      default: 'TEXT_OVERLAY',
    },
    type: {
      type: String,
      enum: ['BANNER', 'ANNOUNCEMENT', 'TICKER', 'HERO_BANNER'],
      default: 'HERO_BANNER',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

bannerOfferSchema.index({ type: 1, isActive: 1, order: 1 });

export const BannerOffer = mongoose.model('BannerOffer', bannerOfferSchema);
export default BannerOffer;
