import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User } from './models/User.js';
import { Category } from './models/Category.js';
import { Product } from './models/Product.js';
import { Order } from './models/Order.js';
import { Cart } from './models/Cart.js';
import { Coupon } from './models/Coupon.js';
import { DeviceModel } from './models/DeviceModel.js';
import { BannerOffer } from './models/BannerOffer.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://rohit_db_user:ChhotaBhai123@cluster0.zjvsoi9.mongodb.net/chhotabhai?retryWrites=true&w=majority';

export const seedDatabase = async () => {
  try {
    console.log('[Seeder] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[Seeder] Connected successfully.');

    console.log('[Seeder] Wiping obsolete collection data...');
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Cart.deleteMany({}),
      Coupon.deleteMany({}),
      DeviceModel.deleteMany({}),
      BannerOffer.deleteMany({}),
    ]);

    console.log('[Seeder] Creating Verified Administrative & Demo User Accounts...');
    const [adminUser, demoCustomer] = await Promise.all([
      User.create({
        name: 'ChhotaBhai Commander',
        email: 'admin@chhotabhai.com',
        password: 'Admin@12345',
        phone: '+91 9999988888',
        role: 'admin',
        isActive: true,
      }),
      User.create({
        name: 'Rohit Sharma',
        email: 'rohit@chhotabhai.com',
        password: 'Customer@12345',
        phone: '+91 9876543210',
        role: 'customer',
        isActive: true,
        addresses: [
          {
            fullName: 'Rohit Sharma',
            phone: '+91 9876543210',
            street: 'Flat 402, Skyline Residency, MG Road',
            landmark: 'Opposite Metro Station',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560001',
            country: 'India',
            isDefault: true,
          },
        ],
      }),
    ]);

    console.log('[Seeder] Seeding Compatible Phone Device Models...');
    const phoneModels = await DeviceModel.insertMany([
      // Apple
      { brand: 'Apple', modelName: 'iPhone 16 Pro Max', isActive: true },
      { brand: 'Apple', modelName: 'iPhone 16 Pro', isActive: true },
      { brand: 'Apple', modelName: 'iPhone 16', isActive: true },
      { brand: 'Apple', modelName: 'iPhone 15 Pro Max', isActive: true },
      { brand: 'Apple', modelName: 'iPhone 15 Pro', isActive: true },
      { brand: 'Apple', modelName: 'iPhone 15', isActive: true },
      { brand: 'Apple', modelName: 'iPhone 14', isActive: true },
      { brand: 'Apple', modelName: 'iPhone 13', isActive: true },

      // Samsung
      { brand: 'Samsung', modelName: 'Galaxy S24 Ultra', isActive: true },
      { brand: 'Samsung', modelName: 'Galaxy S24', isActive: true },
      { brand: 'Samsung', modelName: 'Galaxy S23 Ultra', isActive: true },
      { brand: 'Samsung', modelName: 'Galaxy S23', isActive: true },
      { brand: 'Samsung', modelName: 'Galaxy A55', isActive: true },
      { brand: 'Samsung', modelName: 'Galaxy A35', isActive: true },

      // OnePlus
      { brand: 'OnePlus', modelName: 'OnePlus 12', isActive: true },
      { brand: 'OnePlus', modelName: 'OnePlus 12R', isActive: true },
      { brand: 'OnePlus', modelName: 'OnePlus 11', isActive: true },
      { brand: 'OnePlus', modelName: 'OnePlus Nord 4', isActive: true },
      { brand: 'OnePlus', modelName: 'OnePlus Nord CE 4', isActive: true },

      // Vivo
      { brand: 'Vivo', modelName: 'Vivo V40 Pro', isActive: true },
      { brand: 'Vivo', modelName: 'Vivo V30', isActive: true },

      // Realme
      { brand: 'Realme', modelName: 'Realme 13 Pro+', isActive: true },
      { brand: 'Realme', modelName: 'Realme GT 6T', isActive: true },

      // Xiaomi
      { brand: 'Xiaomi', modelName: 'Xiaomi 14 Ultra', isActive: true },
      { brand: 'Xiaomi', modelName: 'Xiaomi 14', isActive: true },
      { brand: 'Xiaomi', modelName: 'Redmi Note 13 Pro+', isActive: true },

      // Nothing
      { brand: 'Nothing', modelName: 'Phone (2)', isActive: true },
      { brand: 'Nothing', modelName: 'Phone (2a)', isActive: true },
    ]);

    console.log('[Seeder] Seeding Mobile Accessory & Audio Categories...');
    const categories = await Category.insertMany([
      {
        name: 'True Wireless Earbuds',
        slug: 'tws-earbuds',
        description: 'Ultra-low latency gaming and quad ENC mic wireless earbuds',
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
        order: 1,
      },
      {
        name: 'Smart Watches',
        slug: 'smartwatches',
        description: 'HD AMOLED display BT calling fitness smart watches',
        image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=80',
        order: 2,
      },
      {
        name: 'Wireless Neckbands',
        slug: 'wireless-neckbands',
        description: 'Dual pairing, fast charging ergonomic wireless neckbands',
        image: 'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=600&auto=format&fit=crop&q=80',
        order: 3,
      },
      {
        name: 'Wireless Headphones',
        slug: 'wireless-headphones',
        description: 'Over-ear hybrid active noise cancelling studio headphones',
        image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80',
        order: 4,
      },
      {
        name: 'Wireless Speakers',
        slug: 'wireless-speakers',
        description: 'IPX7 waterproof rugged party and portable bluetooth speakers',
        image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&auto=format&fit=crop&q=80',
        order: 5,
      },
      {
        name: '4K Camera Drones',
        slug: 'camera-drones',
        description: 'GPS auto-return, 3-axis gimbal 4K UHD foldable camera drones',
        image: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=600&auto=format&fit=crop&q=80',
        order: 6,
      },
      {
        name: 'Soundbars',
        slug: 'soundbars',
        description: 'Cinematic Dolby audio home theatre wireless soundbars with subwoofer',
        image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80',
        order: 7,
      },
      {
        name: 'Dashcams',
        slug: 'dashcams',
        description: 'Ultra-wide angle 2K night-vision front and rear car dashcams',
        image: 'https://images.unsplash.com/photo-1558441719-74a4d65c4004?w=600&auto=format&fit=crop&q=80',
        order: 8,
      },
      {
        name: 'Projectors',
        slug: 'projectors',
        description: 'Smart 1080P/4K home cinema LED theater projectors with WiFi & Bluetooth',
        image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80',
        order: 9,
      },
      {
        name: 'Back Cases',
        slug: 'back-cases',
        description: 'Military-grade drop tested shockproof, frosted matte & MagSafe liquid silicone covers',
        image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&auto=format&fit=crop&q=80',
        order: 10,
      },
      {
        name: 'Tempered Glass',
        slug: 'tempered-glass',
        description: '9H diamond hardness, edge-to-edge privacy and anti-scratch crystal display guards',
        image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600&auto=format&fit=crop&q=80',
        order: 11,
      },
      {
        name: 'Fast Wall Chargers',
        slug: 'fast-wall-chargers',
        description: '65W GaN III and 33W SuperVOOC rapid charging adapters with dual USB-C ports',
        image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80',
        order: 12,
      },
      {
        name: 'Braided Data Cables',
        slug: 'braided-data-cables',
        description: '100W PD heavy-duty Kevlar braided Type-C & Lightning cables with zinc alloy connectors',
        image: 'https://images.unsplash.com/photo-1541877944-ac82a091518a?w=600&auto=format&fit=crop&q=80',
        order: 13,
      },
      {
        name: 'Camera Lens Protectors',
        slug: 'camera-lens-protectors',
        description: 'Sapphire optical ring protectors engineered for zero lens flare and anti-scratch shielding',
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
        order: 14,
      },
      {
        name: 'MagSafe Mounts',
        slug: 'magsafe-mounts',
        description: 'N52 neodymium magnetic car vent mounts and wireless desktop charging stations',
        image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&auto=format&fit=crop&q=80',
        order: 15,
      },
    ]);

    const catMap = categories.reduce((acc, cat) => {
      acc[cat.slug] = cat._id;
      return acc;
    }, {});
    catMap['audio-wearables'] = catMap['tws-earbuds'];

    console.log('[Seeder] Creating 100% Authentic Mobile Accessory Catalog under ChhotaBhai Essentials...');
    const products = await Product.create([
      // 1. Shockproof MagSafe Matte Case
      {
        title: 'ChhotaBhai Frosted MagSafe Shockproof Case',
        description:
          '10ft military-grade drop tested armor with built-in N52 strong neodymium MagSafe magnets. Features oleophobic anti-fingerprint matte back and reinforced corner air-cushions for extreme phone defense.',
        category: catMap['back-cases'],
        brand: 'ChhotaBhai Essentials',
        badge: 'Drop Tested',
        isCrazyDeal: true,
        isFeatured: true,
        dealTag: 'Drop Tested | N52 MagSafe',
        specifications: {
          'Drop Protection': '10ft / 3 Meter Military Grade MIL-STD-810G',
          'MagSafe Strength': '2800Gs N52 Neodymium Magnets',
          'Bezel Elevation': '1.5mm Screen Lip & 2.0mm Camera Ring',
          'Material Finish': 'Bayer Optical Polycarbonate & TPU Bumper',
        },
        supportedDevices: [
          'iPhone 16 Pro Max',
          'iPhone 16 Pro',
          'iPhone 16',
          'iPhone 15 Pro Max',
          'iPhone 15 Pro',
          'iPhone 15',
          'Galaxy S24 Ultra',
          'Galaxy S24',
          'OnePlus 12',
        ],
        variants: [
          {
            sku: 'CB-CASE-FROST-BLK',
            colorName: 'Carbon Matte Black',
            colorCode: '#121316',
            images: [
              'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&auto=format&fit=crop&q=80',
              'https://images.unsplash.com/photo-1541877944-ac82a091518a?w=800&auto=format&fit=crop&q=80',
            ],
            mrp: 1499,
            sellingPrice: 599,
            stockQuantity: 120,
            isAvailable: true,
          },
          {
            sku: 'CB-CASE-FROST-BLU',
            colorName: 'Deep Titanium Blue',
            colorCode: '#1A2942',
            images: [
              'https://images.unsplash.com/photo-1541877944-ac82a091518a?w=800&auto=format&fit=crop&q=80',
            ],
            mrp: 1499,
            sellingPrice: 599,
            stockQuantity: 80,
            isAvailable: true,
          },
        ],
      },

      // 2. 9H Privacy Tempered Glass
      {
        title: 'ChhotaBhai 9H Diamond Privacy Tempered Glass',
        description:
          '28-degree micro-louver anti-peeping privacy screen protector with 9H diamond surface hardness. Features edge-to-edge curved 2.5D oleophobic coating to prevent fingerprints and scratches.',
        category: catMap['tempered-glass'],
        brand: 'ChhotaBhai Essentials',
        badge: '9H Hardness',
        isCrazyDeal: true,
        isFeatured: true,
        dealTag: '28° Privacy | 9H Hardness',
        specifications: {
          Hardness: '9H Diamond-Grade Tempered Glass',
          Privacy: '28° Two-Way Anti-Spy Filtering',
          Clarity: '99.9% High-Transparency Optical Glass',
          Coating: 'Electroplated Oleophobic Nano Coating',
        },
        supportedDevices: [
          'iPhone 16 Pro Max',
          'iPhone 16 Pro',
          'iPhone 15 Pro Max',
          'iPhone 15 Pro',
          'iPhone 14 Pro',
          'Galaxy S24 Ultra',
          'OnePlus 12',
        ],
        variants: [
          {
            sku: 'CB-GLASS-PRIV-01',
            colorName: 'Privacy Black Border',
            colorCode: '#050505',
            images: [
              'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&auto=format&fit=crop&q=80',
            ],
            mrp: 899,
            sellingPrice: 299,
            stockQuantity: 250,
            isAvailable: true,
          },
        ],
      },

      // 3. 65W GaN III Dual-Port Charger
      {
        title: 'ChhotaBhai 65W GaN III Ultra Fast Wall Charger',
        description:
          'Next-gen Gallium Nitride (GaN III) high-efficiency power delivery adapter. Powers iPhone to 60% in 25 minutes and delivers full 65W turbo charging for Samsung, OnePlus and MacBooks.',
        category: catMap['fast-wall-chargers'],
        brand: 'ChhotaBhai Essentials',
        badge: '65W Fast Charge',
        isCrazyDeal: true,
        dealTag: '65W GaN III | Dual Port',
        specifications: {
          'Maximum Output': '65W Max Power Delivery 3.0 / PPS / QC 4.0',
          Ports: '1x USB-C (65W) + 1x USB-A (30W)',
          Technology: 'GaN III Semiconductor with Smart Temperature Control',
          Protection: 'Short-Circuit, Over-Voltage, and Thermal Guard',
        },
        supportedDevices: ['Universal Smartphone Charging', 'iPhone 16/15', 'Galaxy S24', 'OnePlus 12'],
        variants: [
          {
            sku: 'CB-CHG-65W-BLK',
            colorName: 'Stealth Black',
            colorCode: '#0f0f10',
            images: [
              'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
            ],
            mrp: 2999,
            sellingPrice: 1299,
            stockQuantity: 90,
            isAvailable: true,
          },
          {
            sku: 'CB-CHG-65W-WHT',
            colorName: 'Pure White',
            colorCode: '#F8F9FA',
            images: [
              'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
            ],
            mrp: 2999,
            sellingPrice: 1299,
            stockQuantity: 65,
            isAvailable: true,
          },
        ],
      },

      // 4. 100W PD Heavy-Duty Braided Cable
      {
        title: 'ChhotaBhai 100W Kevlar Braided Type-C to Type-C Cable',
        description:
          'Engineered for extreme durability with double-braided ballistic nylon and reinforced zinc alloy connectors. Supports up to 100W PD fast charging with E-Marker smart chipset.',
        category: catMap['braided-data-cables'],
        brand: 'ChhotaBhai Essentials',
        badge: 'Bestseller',
        isCrazyDeal: true,
        dealTag: '100W PD | E-Marker Chip',
        specifications: {
          'Power Rating': '100W PD 5A Fast Charging',
          'Data Transfer': '480 Mbps High-Speed Sync',
          Length: '1.5 Meters (5 Feet)',
          Durability: 'Tested for 25,000+ Severe Bends',
        },
        supportedDevices: ['Universal Type-C Phones', 'Android', 'iPhone 15/16', 'MacBook', 'iPad'],
        variants: [
          {
            sku: 'CB-CBL-100W-RED',
            colorName: 'Crimson Carbon',
            colorCode: '#E11938',
            images: [
              'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
            ],
            mrp: 999,
            sellingPrice: 349,
            stockQuantity: 180,
            isAvailable: true,
          },
        ],
      },

      // 5. Sapphire Camera Lens Ring Protector
      {
        title: 'ChhotaBhai Sapphire Individual Camera Lens Protector',
        description:
          'Individual aerospace-grade titanium alloy rings with anti-reflective sapphire glass. Protects camera lenses from direct impacts without compromising night-mode photo quality.',
        category: catMap['camera-lens-protectors'],
        brand: 'ChhotaBhai Essentials',
        badge: '9H Hardness',
        specifications: {
          Material: 'Optical Sapphire Glass & Aerospace Alloy Rings',
          Clarity: '99.9% Light Transmittance with AR Coating',
          Installation: 'Zero-Bubble Auto-Alignment Alignment Tray Included',
        },
        supportedDevices: ['iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 15 Pro Max', 'Galaxy S24 Ultra'],
        variants: [
          {
            sku: 'CB-LENS-TITAN-01',
            colorName: 'Natural Titanium',
            colorCode: '#A29E9A',
            images: [
              'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
            ],
            mrp: 799,
            sellingPrice: 249,
            stockQuantity: 140,
            isAvailable: true,
          },
        ],
      },

      // 6. ChhotaBhai Sonic Pods ENC Audio
      {
        title: 'ChhotaBhai Sonic Pods Pro Wireless Earbuds',
        description:
          'Engineered for crystal-clear smartphone calling with 4-mic Environmental Noise Cancellation (ENC) and 45ms ultra-low latency mobile gaming mode. 40 hours total backup with fast charging.',
        category: catMap['audio-wearables'],
        brand: 'ChhotaBhai Essentials',
        badge: 'Shockproof',
        specifications: {
          Latency: '45ms Ultra-Low Gaming Latency',
          Microphones: 'Quad ENC Mic Array for HD Calling',
          Battery: '40 Hours Total (8 Hours single bud playtime)',
          'Water Rating': 'IPX5 Sweat & Rain Resistance',
        },
        supportedDevices: ['Universal Bluetooth 5.3', 'iOS', 'Android', 'Windows'],
        variants: [
          {
            sku: 'CB-AUDIO-SONIC-BLK',
            colorName: 'Obsidian Black',
            colorCode: '#0a0b0e',
            images: [
              'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
            ],
            mrp: 2499,
            sellingPrice: 999,
            stockQuantity: 95,
            isAvailable: true,
          },
        ],
      },

      // 7. MagSafe Magnetic Car Vent Mount
      {
        title: 'ChhotaBhai N52 MagSafe 15W Wireless Car Mount',
        description:
          'Ultra-secure twist-lock air vent car mount with 16 ultra-strong N52 neodymium magnets. Delivers fast 15W Qi wireless charging with 360-degree rotation ball joint.',
        category: catMap['magsafe-mounts'],
        brand: 'ChhotaBhai Essentials',
        badge: 'MagSafe',
        specifications: {
          'Magnetic Force': 'Holds up to 1.8kg phone weight over rough roads',
          'Wireless Power': '15W Fast Qi Magnetic Induction',
          Mounting: 'Universal Twist-Lock Steel Air Vent Clamp',
        },
        supportedDevices: ['MagSafe Compatible Phones', 'iPhone 13/14/15/16', 'MagSafe Cases'],
        variants: [
          {
            sku: 'CB-MOUNT-CAR-BLK',
            colorName: 'Matte Space Gray',
            colorCode: '#262930',
            images: [
              'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80',
            ],
            mrp: 2199,
            sellingPrice: 899,
            stockQuantity: 70,
            isAvailable: true,
          },
        ],
      },

      // 8. boAt / ChhotaBhai Airdopes 161
      {
        title: 'ChhotaBhai Airdopes 161',
        description: 'True Wireless Earbuds with 40 Hours Playback, 10mm Drivers, ASAP Charge, and IPX5 Water Resistance.',
        category: catMap['tws-earbuds'],
        brand: 'ChhotaBhai Essentials',
        badge: 'Engraving Available',
        isTopDeal: true,
        dealTag: '40 Hours Playback | ASAP Charge',
        specifications: {
          Playback: '40 Hours Playback',
          Drivers: '10mm Dynamic Audio Drivers',
          Charging: 'ASAP Charge: 10 mins = 180 mins playtime',
        },
        supportedDevices: ['Universal Bluetooth 5.3', 'iOS', 'Android'],
        ratings: 4.8,
        variants: [
          {
            sku: 'CB-TWS-161-BLK',
            colorName: 'Carbon Black',
            colorCode: '#111827',
            images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80'],
            mrp: 2490,
            sellingPrice: 999,
            stockQuantity: 120,
            isAvailable: true,
          },
          {
            sku: 'CB-TWS-161-BLU',
            colorName: 'Royal Blue',
            colorCode: '#1e3a8a',
            images: ['https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800&auto=format&fit=crop&q=80'],
            mrp: 2490,
            sellingPrice: 999,
            stockQuantity: 90,
            isAvailable: true,
          },
        ],
      },

      // 9. ChhotaBhai Storm Call 3 Smartwatch
      {
        title: 'ChhotaBhai Storm Call 3',
        description: '1.83" HD Display Smartwatch with Bluetooth Calling, 700+ Active Modes, Turn-by-Turn Navigation & Crest App Health Ecosystem.',
        category: catMap['smartwatches'],
        brand: 'ChhotaBhai Essentials',
        badge: 'New Launch',
        isTopDeal: true,
        dealTag: '1.83" HD Display | BT Calling',
        specifications: {
          Feature: 'BT Calling',
          Display: '1.83" HD Display with 550 Nits Peak Brightness',
          Battery: 'Up to 7 Days Battery Life',
        },
        supportedDevices: ['iOS 12+', 'Android 8+'],
        ratings: 4.7,
        variants: [
          {
            sku: 'CB-WATCH-STORM3-SLV',
            colorName: 'Silver Metal Mesh',
            colorCode: '#94a3b8',
            images: ['https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80'],
            mrp: 8499,
            sellingPrice: 1199,
            stockQuantity: 85,
            isAvailable: true,
          },
          {
            sku: 'CB-WATCH-STORM3-GRN',
            colorName: 'Deep Olive Green',
            colorCode: '#14532d',
            images: ['https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80'],
            mrp: 8499,
            sellingPrice: 1199,
            stockQuantity: 65,
            isAvailable: true,
          },
        ],
      },

      // 10. ChhotaBhai Nirvana Ion ANC
      {
        title: 'ChhotaBhai Nirvana Ion',
        description: 'Premium ANC Earbuds with 120 Hours Total Playback, Dual EQ Modes, Crystal Bionic Sound powered by HiFi DSP.',
        category: catMap['tws-earbuds'],
        brand: 'ChhotaBhai Essentials',
        badge: 'Engraving Available',
        isTopDeal: true,
        dealTag: '120 Hours Playback | 32dB ANC',
        specifications: {
          Playback: '120 Hours Playback',
          ANC: '32dB Active Noise Cancellation',
          Sound: 'Crystal Bionic HiFi Sound',
        },
        supportedDevices: ['Universal Bluetooth 5.3', 'iOS', 'Android'],
        ratings: 4.9,
        variants: [
          {
            sku: 'CB-TWS-NIRV-WHT',
            colorName: 'Ivory White',
            colorCode: '#f8fafc',
            images: ['https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800&auto=format&fit=crop&q=80'],
            mrp: 7990,
            sellingPrice: 1499,
            stockQuantity: 110,
            isAvailable: true,
          },
        ],
      },

      // 11. ChhotaBhai Rockerz 412
      {
        title: 'ChhotaBhai Rockerz 412',
        description: 'Over-Ear Wireless Headphones with 60 Hours Playback, 40mm Dynamic Drivers, Dual EQ Modes & Ultra-Plush Memory Foam Cushions.',
        category: catMap['wireless-headphones'],
        brand: 'ChhotaBhai Essentials',
        badge: 'Free Spotify',
        isTopDeal: true,
        dealTag: '60 Hours Playback | 40mm Drivers',
        specifications: {
          Playback: '60 Hrs Playback',
          Drivers: '40mm High Fidelity Bass Drivers',
          Comfort: 'Ultra-Plush Ergonomic Earcups',
        },
        supportedDevices: ['Universal Bluetooth 5.3', '3.5mm AUX Cable'],
        ratings: 4.8,
        variants: [
          {
            sku: 'CB-HD-412-BLK',
            colorName: 'Matte Charcoal Black',
            colorCode: '#1f2937',
            images: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80'],
            mrp: 2999,
            sellingPrice: 1099,
            stockQuantity: 75,
            isAvailable: true,
          },
        ],
      },

      // 12. ChhotaBhai Aavante Bar 480
      {
        title: 'ChhotaBhai Aavante Bar 480',
        description: 'Compact Wireless Soundbar with 10W RMS Cinematic Audio, Dual Passive Radiators, Multi-Connectivity Bluetooth & Aux.',
        category: catMap['soundbars'],
        brand: 'ChhotaBhai Essentials',
        badge: 'Free Spotify',
        isTopDeal: true,
        dealTag: '10W RMS Sound | Subwoofer Bass',
        specifications: {
          Feature: '10W RMS Sound',
          Connectivity: 'Bluetooth 5.3 / AUX / USB / TF Card',
          Battery: '7 Hours Portable Playback',
        },
        supportedDevices: ['Smart TVs', 'Laptops', 'Smartphones', 'Tablets'],
        ratings: 4.7,
        variants: [
          {
            sku: 'CB-SND-480-BLK',
            colorName: 'Midnight Black',
            colorCode: '#0f172a',
            images: ['https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80'],
            mrp: 3490,
            sellingPrice: 1149,
            stockQuantity: 60,
            isAvailable: true,
          },
        ],
      },

      // 13. ChhotaBhai Falcon 4K GPS Drone
      {
        title: 'ChhotaBhai Falcon 4K GPS Drone',
        description: 'Foldable Brushless Drone with 4K UHD Camera, 3-Axis Anti-Shake Mechanical Gimbal, 5GHz FPV Transmission & GPS Auto-Return.',
        category: catMap['camera-drones'],
        brand: 'ChhotaBhai Essentials',
        badge: 'Trending',
        isTopDeal: true,
        dealTag: '4K UHD Gimbal | 30 Mins Flight',
        specifications: {
          Feature: '4K UHD Gimbal Camera',
          Battery: '30 Mins Flight Time per battery',
          Range: '2.5 KM 5GHz Live Video Transmission',
        },
        supportedDevices: ['iOS App & Android RC Controller'],
        ratings: 4.9,
        variants: [
          {
            sku: 'CB-DRONE-FALCON-4K',
            colorName: 'Space Titanium Gray',
            colorCode: '#475569',
            images: ['https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800&auto=format&fit=crop&q=80'],
            mrp: 7999,
            sellingPrice: 2999,
            stockQuantity: 40,
            isAvailable: true,
          },
        ],
      },

      // 14. ChhotaBhai EnergyShroom PB300 Pro
      {
        title: 'ChhotaBhai EnergyShroom PB300 Pro',
        description: '10000mAh Ultra-Compact Fast Charging Power Bank with 22.5W Two-Way Quick Charge & 12-Layer Smart IC Circuit Protection.',
        category: catMap['fast-wall-chargers'],
        brand: 'ChhotaBhai Essentials',
        badge: 'EXTRA ₹100 OFF',
        specifications: {
          Capacity: '10000mAh Battery',
          Speed: '22.5W Super Fast Power Delivery',
          Ports: 'Dual USB-A + Type-C PD Ports',
        },
        supportedDevices: ['iPhone 16/15', 'Galaxy S24', 'OnePlus 12', 'Pixel 9'],
        ratings: 5.0,
        variants: [
          {
            sku: 'CB-PB-300-BLK',
            colorName: 'Stealth Black',
            colorCode: '#18181b',
            images: ['https://images.unsplash.com/photo-1609592426508-cc24f60500bf?w=800&auto=format&fit=crop&q=80'],
            mrp: 3499,
            sellingPrice: 1399,
            stockQuantity: 95,
            isAvailable: true,
          },
        ],
      },
    ]);

    console.log('[Seeder] Creating Promotional Banners & Announcement Alerts...');
    await BannerOffer.insertMany([
      {
        title: 'Celebrate The Moments, Make Them Personal',
        subtitle: 'A Special Gift For Every Festive | Custom Engraving @ ₹29 Only',
        imageUrl: '/festive-banner-chhotabhai.jpg',
        redirectUrl: '/shop',
        badgeText: 'FESTIVE SALE',
        ctaText: 'Shop Now',
        bannerMode: 'TEXT_OVERLAY',
        type: 'HERO_BANNER',
        isActive: true,
        order: 1,
      },
      {
        title: 'Next-Gen 65W GaN & MagSafe Armor',
        subtitle: 'Engineered precision covers, 9H privacy glass, and ultra-fast GaN chargers.',
        imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=1600&auto=format&fit=crop&q=80',
        redirectUrl: '/shop?category=fast-wall-chargers',
        badgeText: '65W FAST CHARGE',
        ctaText: 'Shop Chargers',
        bannerMode: 'TEXT_OVERLAY',
        type: 'HERO_BANNER',
        isActive: true,
        order: 2,
      },
      {
        title: 'Extra 50% Off Flash Drop',
        subtitle: 'Wireless audio, smartwatches and accessories at exclusive festival prices. Use Code: DROP50',
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1600&auto=format&fit=crop&q=80',
        redirectUrl: '/shop',
        badgeText: 'FLASH DROP',
        ctaText: 'Claim 50% Off',
        bannerMode: 'TEXT_OVERLAY',
        type: 'HERO_BANNER',
        isActive: true,
        order: 3,
      },
      {
        title: '100% PREPAID DISPATCH: Instant UPI & Cards with Free Express Delivery across India!',
        subtitle: 'Use code CHHOTABHAI10 for Extra 10% Off',
        type: 'ANNOUNCEMENT',
        badgeText: 'PREPAID DEAL',
        redirectUrl: '/shop',
        isActive: true,
        order: 1,
      },
      {
        title: 'ChhotaBhai Precision Armor Cases',
        subtitle: '10ft Military Drop Protection with Strong N52 MagSafe Alignment',
        imageUrl: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=1200&auto=format&fit=crop&q=80',
        redirectUrl: '/shop?category=back-cases',
        badgeText: 'DROP TESTED',
        type: 'BANNER',
        isActive: true,
        order: 1,
      },
    ]);

    console.log('[Seeder] Creating Active Discount Coupons...');
    await Coupon.insertMany([
      {
        code: 'CHHOTABHAI10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValue: 499,
        maxDiscountAmount: 200,
        expiryDate: new Date('2028-12-31'),
        usageLimit: null,
        usedCount: 0,
        isActive: true,
      },
      {
        code: 'PREPAID50',
        discountType: 'FLAT',
        discountValue: 50,
        minOrderValue: 399,
        maxDiscountAmount: 50,
        expiryDate: new Date('2028-12-31'),
        usageLimit: null,
        usedCount: 0,
        isActive: true,
      },
      {
        code: 'ARMOR15',
        discountType: 'PERCENTAGE',
        discountValue: 15,
        minOrderValue: 799,
        maxDiscountAmount: 300,
        expiryDate: new Date('2028-12-31'),
        usageLimit: null,
        usedCount: 0,
        isActive: true,
      },
    ]);

    console.log('[Seeder] Seed Execution Summary:');
    console.log(`- Administrative User: admin@chhotabhai.com (Pass: Admin@12345)`);
    console.log(`- Customer User:       rohit@chhotabhai.com (Pass: Customer@12345)`);
    console.log(`- Device Models:       ${phoneModels.length} (Apple, Samsung, OnePlus)`);
    console.log(`- Categories:          ${categories.length} Mobile Accessory Categories`);
    console.log(`- Products:            ${products.length} Under Brand 'ChhotaBhai Essentials'`);
    console.log(`- Payment Policy:      100% Prepaid (COD Completely Removed)`);

    return {
      success: true,
      userCount: 2,
      deviceCount: phoneModels.length,
      productCount: products.length,
    };
  } catch (error) {
    console.error('[Seeder Error] Execution failed:', error);
    throw error;
  }
};

// Allow CLI execution: node seeder.js
if (process.argv[1]?.endsWith('seeder.js')) {
  seedDatabase()
    .then(() => {
      console.log('[Seeder] Database successfully populated.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seeder] Failed with error:', err);
      process.exit(1);
    });
}

export default seedDatabase;
