/**
 * @file populate_crazy_deals.js
 * @description Injects and activates high-converting Crazy Deals into ChhotaBhai catalog.
 */

import mongoose from 'mongoose';
import { Product } from './models/Product.js';
import { Category } from './models/Category.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chhotabhai_ecommerce';

async function populateCrazyDeals() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for Crazy Deals expansion...');

    const categories = await Category.find();
    const catMap = categories.reduce((acc, cat) => {
      acc[cat.slug] = cat._id;
      return acc;
    }, {});

    // 1. Activate isCrazyDeal on existing high-discount catalog items
    const titlesToActivate = [
      {
        title: 'ChhotaBhai Sapphire Individual Camera Lens Protector',
        dealTag: '69% OFF | Sapphire Glass',
        badge: 'Crazy Deal',
      },
      {
        title: 'ChhotaBhai Sonic Pods Pro Wireless Earbuds',
        dealTag: '60% OFF | 45ms Latency',
        badge: 'Crazy Deal',
      },
      {
        title: 'ChhotaBhai N52 MagSafe 15W Wireless Car Mount',
        dealTag: '59% OFF | 15W Fast Charge',
        badge: 'Crazy Deal',
      },
      {
        title: 'ChhotaBhai Storm Call 3',
        dealTag: '86% OFF | BT Calling',
        badge: 'Crazy Deal',
      },
      {
        title: 'ChhotaBhai Nirvana Ion',
        dealTag: '81% OFF | 120H Playback',
        badge: 'Crazy Deal',
      },
      {
        title: 'ChhotaBhai Rockerz 412',
        dealTag: '63% OFF | Super Extra Bass',
        badge: 'Crazy Deal',
      },
      {
        title: 'ChhotaBhai EnergyShroom PB300 Pro',
        dealTag: '60% OFF | 22.5W Fast Charge',
        badge: 'Crazy Deal',
      },
      {
        title: 'ChhotaBhai Airdopes 161',
        dealTag: '60% OFF | ASAP Charge',
        badge: 'Crazy Deal',
      },
      {
        title: 'ChhotaBhai Falcon 4K GPS Drone',
        dealTag: '63% OFF | 4K Ultra HD',
        badge: 'Crazy Deal',
      },
    ];

    for (const item of titlesToActivate) {
      const res = await Product.updateOne(
        { title: { $regex: new RegExp(`^${item.title}$`, 'i') } },
        {
          $set: {
            isCrazyDeal: true,
            dealTag: item.dealTag,
            badge: item.badge,
          },
        }
      );
      if (res.matchedCount > 0) {
        console.log(`✅ Activated Crazy Deal on: ${item.title}`);
      }
    }

    // 2. Add brand-new high-demand Crazy Deal products
    const newCrazyProducts = [
      {
        title: 'ChhotaBhai 3-in-1 Foldable MagSafe Wireless Charging Station',
        description:
          'Simultaneously charge your iPhone, Apple Watch, and AirPods with 15W Qi-certified magnetic high-speed charging. Ultra-compact aircraft-grade aluminum fold design for desk & travel.',
        category: catMap['magsafe-mounts'] || catMap['fast-wall-chargers'],
        brand: 'ChhotaBhai Essentials',
        badge: 'Crazy Deal',
        isCrazyDeal: true,
        isFeatured: true,
        dealTag: '71% OFF | 15W 3-in-1 Qi',
        specifications: {
          'Phone Output': '15W / 10W / 7.5W Fast Magnetic Wireless',
          'Watch Output': '2.5W Apple Watch Fast Charger',
          'Earbuds Output': '5W Qi Wireless Charging Pad',
          Material: 'Anodized Aerospace Aluminum Alloy',
        },
        supportedDevices: ['iPhone 16/15/14/13/12', 'Apple Watch Ultra/Series 9/8', 'AirPods Pro/3'],
        variants: [
          {
            sku: 'CB-CHG-3IN1-SLV',
            colorName: 'Space Silver',
            colorCode: '#D8D8D8',
            images: [
              'https://images.unsplash.com/photo-1622445262464-84b14e4b7571?w=800&auto=format&fit=crop&q=80',
            ],
            mrp: 4499,
            sellingPrice: 1299,
            stockQuantity: 110,
            isAvailable: true,
          },
          {
            sku: 'CB-CHG-3IN1-BLK',
            colorName: 'Matte Space Black',
            colorCode: '#1C1C1E',
            images: [
              'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
            ],
            mrp: 4499,
            sellingPrice: 1299,
            stockQuantity: 95,
            isAvailable: true,
          },
        ],
      },
      {
        title: 'ChhotaBhai Ultra Hybrid Anti-Yellowing Clear Case',
        description:
          '100% optical clarity with anti-UV molecular coating that never turns yellow. Features 360-degree shockproof TPU bumpers, 1.8mm raised camera lips, and wireless charging compatibility.',
        category: catMap['back-cases'],
        brand: 'ChhotaBhai Essentials',
        badge: 'Crazy Deal',
        isCrazyDeal: true,
        isFeatured: true,
        dealTag: '69% OFF | Never Yellows',
        specifications: {
          Clarity: '99.9% Bayer German Polycarbonate Optical Back',
          'Anti-Yellowing': 'UV Resisting Polymer Matrix Infused',
          Protection: '8ft Shock-Absorbing Air Cushion Corners',
        },
        supportedDevices: ['iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 15', 'Galaxy S24 Ultra', 'OnePlus 12'],
        variants: [
          {
            sku: 'CB-CASE-CLR-HYB',
            colorName: 'Crystal Clear',
            colorCode: '#FFFFFF',
            images: [
              'https://images.unsplash.com/photo-1541877944-ac82a091518a?w=800&auto=format&fit=crop&q=80',
            ],
            mrp: 1299,
            sellingPrice: 399,
            stockQuantity: 150,
            isAvailable: true,
          },
        ],
      },
      {
        title: 'ChhotaBhai 120W Liquid Silicone Type-C Fast Cable',
        description:
          'Super-soft food-grade liquid silicone exterior that resists tangles and withstands 30,000+ bends. Built-in smart E-Marker chip supports up to 120W flash charging without heating your phone.',
        category: catMap['braided-data-cables'],
        brand: 'ChhotaBhai Essentials',
        badge: 'Crazy Deal',
        isCrazyDeal: true,
        dealTag: '72% OFF | 120W Tangle-Free',
        specifications: {
          Power: '120W Max (6A High Current)',
          Material: 'Ultra-Soft Liquid Silicone with Zinc Alloy Heads',
          Length: '1.2 Meters (4 Feet)',
          Features: 'Anti-Kink, Fireproof, Easy-Clean Coating',
        },
        supportedDevices: ['Universal Type-C Phones', 'iPhone 15/16', 'Xiaomi', 'OnePlus', 'Vivo', 'Realme'],
        variants: [
          {
            sku: 'CB-CBL-120W-BLU',
            colorName: 'Sky Cyan',
            colorCode: '#00B4D8',
            images: [
              'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
            ],
            mrp: 999,
            sellingPrice: 279,
            stockQuantity: 200,
            isAvailable: true,
          },
          {
            sku: 'CB-CBL-120W-YEL',
            colorName: 'Cyber Yellow',
            colorCode: '#FFD166',
            images: [
              'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
            ],
            mrp: 999,
            sellingPrice: 279,
            stockQuantity: 120,
            isAvailable: true,
          },
        ],
      },
      {
        title: 'ChhotaBhai 20000mAh 65W PD Turbo Laptop Power Bank',
        description:
          'Massive 20,000mAh battery capacity delivering true 65W Power Delivery through USB-C. Fast charges your phone, iPad, or Type-C laptops. Features precision digital LED battery percentage display.',
        category: catMap['fast-wall-chargers'] || catMap['braided-data-cables'],
        brand: 'ChhotaBhai Essentials',
        badge: 'Crazy Deal',
        isCrazyDeal: true,
        dealTag: '67% OFF | 65W Laptop PD',
        specifications: {
          Capacity: '20,000mAh 74Wh Airline Approved',
          'Type-C Output': '65W Max PD 3.0 / PPS (Charges Laptops)',
          'USB-A Output': '22.5W QC 3.0 / Huawei SCP',
          Display: 'Real-Time Smart Digital LED Display',
        },
        supportedDevices: ['Universal Smart Devices', 'iPhone', 'Galaxy S24', 'MacBook Air', 'Dell XPS'],
        variants: [
          {
            sku: 'CB-PB-65W-20K',
            colorName: 'Metallic Gunmetal Grey',
            colorCode: '#3D3D3D',
            images: [
              'https://images.unsplash.com/photo-1609592426508-cc24f60500bf?w=800&auto=format&fit=crop&q=80',
            ],
            mrp: 5999,
            sellingPrice: 1999,
            stockQuantity: 85,
            isAvailable: true,
          },
        ],
      },
      {
        title: 'ChhotaBhai Gravity Auto-Lock Metal Car Air Vent Mount',
        description:
          'Single-hand drop-and-lock mechanical gravity linkage phone holder. CNC milled aviation aluminum arms with thick shock-absorbing silicone pads to prevent scratches and dashboard rattles.',
        category: catMap['magsafe-mounts'],
        brand: 'ChhotaBhai Essentials',
        badge: 'Crazy Deal',
        isCrazyDeal: true,
        dealTag: '71% OFF | Auto Gravity Lock',
        specifications: {
          Mechanism: 'One-Hand Gravity Linkage Auto-Clamp',
          Ventilation: 'Twist-Lock Steel Air Vent Hook (Fits all AC Vents)',
          Compatibility: '4.7 inch to 7.0 inch Smartphones with Cases',
        },
        supportedDevices: ['All Smartphones with Cases', 'iPhone', 'Samsung', 'OnePlus'],
        variants: [
          {
            sku: 'CB-MOUNT-GRAV-BLK',
            colorName: 'Obsidian Black',
            colorCode: '#111111',
            images: [
              'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80',
            ],
            mrp: 1199,
            sellingPrice: 349,
            stockQuantity: 130,
            isAvailable: true,
          },
        ],
      },
    ];

    for (const prod of newCrazyProducts) {
      const existing = await Product.findOne({
        title: { $regex: new RegExp(`^${prod.title}$`, 'i') },
      });
      if (!existing) {
        await Product.create(prod);
        console.log(`✨ Created New Crazy Deal: ${prod.title} (₹${prod.variants[0].sellingPrice})`);
      } else {
        await Product.updateOne({ _id: existing._id }, { $set: { isCrazyDeal: true, dealTag: prod.dealTag, badge: 'Crazy Deal' } });
        console.log(`🔄 Updated existing: ${prod.title} with Crazy Deal`);
      }
    }

    const totalCrazy = await Product.countDocuments({ isCrazyDeal: true, isActive: true });
    console.log(`\n🎉 Success! Total active Crazy Deals now in database: ${totalCrazy}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error populating crazy deals:', err);
    process.exit(1);
  }
}

populateCrazyDeals();
