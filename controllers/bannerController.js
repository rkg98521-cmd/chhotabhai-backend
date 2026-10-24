import { BannerOffer } from '../models/BannerOffer.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Public: Get all active banners and announcement alerts
export const getActiveBanners = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const filter = { isActive: true };
  if (type) {
    const rawType = type.toUpperCase();
    if (rawType === 'TICKER' || rawType === 'ANNOUNCEMENT') {
      filter.type = { $in: ['TICKER', 'ANNOUNCEMENT'] };
    } else if (rawType === 'HERO_BANNER' || rawType === 'BANNER') {
      filter.type = { $in: ['HERO_BANNER', 'BANNER'] };
    } else {
      filter.type = rawType;
    }
  }

  const items = await BannerOffer.find(filter).sort({ order: 1, createdAt: -1 });
  res.status(200).json(new ApiResponse(200, items, 'Active banners and announcement alerts retrieved.'));
});

// Admin: Get all banners (active & inactive)
export const getAllBanners = asyncHandler(async (req, res) => {
  const items = await BannerOffer.find().sort({ order: 1, createdAt: -1 });
  res.status(200).json(new ApiResponse(200, items, 'All banner and alert campaigns retrieved.'));
});

// Admin: Create new banner / announcement alert
export const createBanner = asyncHandler(async (req, res) => {
  const { title, subtitle, imageUrl, redirectUrl, linkUrl, badgeText, badge, ctaText, bannerMode, type, isActive, order } = req.body;

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Title is required for the banner or announcement alert.');
  }

  const targetLink = (linkUrl || redirectUrl || '/shop').trim();
  const targetBadge = (badge || badgeText || 'SPECIAL DEAL').trim();
  const rawType = (type || 'HERO_BANNER').toUpperCase();

  const banner = await BannerOffer.create({
    title: title.trim(),
    subtitle: (subtitle || '').trim(),
    imageUrl: (imageUrl || '').trim(),
    redirectUrl: targetLink,
    linkUrl: targetLink,
    badgeText: targetBadge,
    badge: targetBadge,
    ctaText: (ctaText || 'Shop Now').trim(),
    bannerMode: bannerMode === 'FULL_IMAGE' ? 'FULL_IMAGE' : 'TEXT_OVERLAY',
    type: rawType,
    isActive: isActive !== false,
    order: Number(order) || 0,
  });

  res.status(201).json(new ApiResponse(201, banner, 'Banner campaign created successfully.'));
});

// Admin: Update banner / announcement alert
export const updateBanner = asyncHandler(async (req, res) => {
  const banner = await BannerOffer.findById(req.params.id);
  if (!banner) {
    throw new ApiError(404, 'Banner campaign not found.');
  }

  const { title, subtitle, imageUrl, redirectUrl, linkUrl, badgeText, badge, ctaText, bannerMode, type, isActive, order } = req.body;

  if (title) banner.title = title.trim();
  if (subtitle !== undefined) banner.subtitle = subtitle.trim();
  if (imageUrl !== undefined) banner.imageUrl = imageUrl.trim();
  if (redirectUrl !== undefined || linkUrl !== undefined) {
    const l = (linkUrl || redirectUrl).trim();
    banner.redirectUrl = l;
    banner.linkUrl = l;
  }
  if (badgeText !== undefined || badge !== undefined) {
    const b = (badge || badgeText).trim();
    banner.badgeText = b;
    banner.badge = b;
  }
  if (ctaText !== undefined) banner.ctaText = ctaText.trim();
  if (bannerMode !== undefined) banner.bannerMode = bannerMode === 'FULL_IMAGE' ? 'FULL_IMAGE' : 'TEXT_OVERLAY';
  if (type) banner.type = type.toUpperCase();
  if (typeof isActive === 'boolean') banner.isActive = isActive;
  if (order !== undefined) banner.order = Number(order);

  await banner.save();
  res.status(200).json(new ApiResponse(200, banner, 'Banner campaign updated successfully.'));
});

// Admin: Delete banner
export const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await BannerOffer.findById(req.params.id);
  if (!banner) {
    throw new ApiError(404, 'Banner campaign not found.');
  }

  await BannerOffer.findByIdAndDelete(req.params.id);
  res.status(200).json(new ApiResponse(200, null, 'Banner campaign removed permanently.'));
});

export default {
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
};
