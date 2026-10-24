import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/chhotabhai_ecommerce');
  const catCol = mongoose.connection.collection('categories');
  const prodCol = mongoose.connection.collection('products');

  let audioCat = await catCol.findOne({ slug: 'tws-earbuds' });
  if (!audioCat) {
    const res = await catCol.insertOne({
      name: 'Wireless Audio & TWS',
      slug: 'tws-earbuds',
      description: 'True wireless stereo earbuds, neckbands, and speakers',
      image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
      isActive: true,
      displayOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    audioCat = { _id: res.insertedId };
  }

  const items = [
    {
      title: 'ChhotaBhai Airdopes 213',
      slug: 'chhotabhai-airdopes-213',
      description: 'True Wireless Earbuds with 50 Hours Playback, ASAP Charge, BEAST Mode for low latency gaming.',
      category: audioCat._id,
      brand: 'ChhotaBhai',
      badge: '🔥 Free Spotify',
      specifications: { Playback: '50 Hours Playback' },
      ratings: { averageRating: 4.8, totalReviews: 240 },
      isFeatured: true,
      isActive: true,
      variants: [
        {
          sku: 'CHHOTA-AD213-BLK',
          colorName: 'Carbon Black',
          colorCode: '#111111',
          mrp: 3290,
          sellingPrice: 2148,
          stockQuantity: 100,
          isAvailable: true,
          images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80'],
        },
      ],
    },
    {
      title: 'ChhotaBhai Rockerz Summit',
      slug: 'chhotabhai-rockerz-summit',
      description: 'Wireless Bluetooth Neckband with 30 Hours Playback, Signature Sound, IPX5 Water Resistance.',
      category: audioCat._id,
      brand: 'ChhotaBhai',
      badge: '🔥 Free Spotify',
      specifications: { Playback: '30 Hours Playback' },
      ratings: { averageRating: 4.5, totalReviews: 312 },
      isFeatured: true,
      isActive: true,
      variants: [
        {
          sku: 'CHHOTA-RK-SUMMIT',
          colorName: 'Royal Blue',
          colorCode: '#1e3a8a',
          mrp: 4490,
          sellingPrice: 1199,
          stockQuantity: 150,
          isAvailable: true,
          images: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80'],
        },
      ],
    },
    {
      title: 'ChhotaBhai PB300 PowerBank',
      slug: 'chhotabhai-pb300-powerbank',
      description: '10000mAh Ultra-Slim Fast Charging Power Bank with Two-Way 22.5W Quick Charge.',
      category: audioCat._id,
      brand: 'ChhotaBhai',
      badge: '⚡ EXTRA ₹300 OFF',
      specifications: { Capacity: '10000mAh Power Bank' },
      ratings: { averageRating: 5.0, totalReviews: 184 },
      isFeatured: true,
      isActive: true,
      variants: [
        {
          sku: 'CHHOTA-PB300-TEAL',
          colorName: 'Teal Steel',
          colorCode: '#0f766e',
          mrp: 2999,
          sellingPrice: 2049,
          stockQuantity: 80,
          isAvailable: true,
          images: ['https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&auto=format&fit=crop&q=80'],
        },
      ],
    },
    {
      title: 'ChhotaBhai Nirvana Iris',
      slug: 'chhotabhai-nirvana-iris',
      description: 'Active Noise Cancellation Wireless Earbuds with Hi-Res Audio, 4-Mic ENx Technology.',
      category: audioCat._id,
      brand: 'ChhotaBhai',
      badge: '🔥 Free Spotify',
      specifications: { Feature: 'Noise Cancellation' },
      ratings: { averageRating: 4.8, totalReviews: 420 },
      isFeatured: true,
      isActive: true,
      variants: [
        {
          sku: 'CHHOTA-NIRVANA-IRIS',
          colorName: 'Pearl White',
          colorCode: '#f1f5f9',
          mrp: 9990,
          sellingPrice: 3299,
          stockQuantity: 60,
          isAvailable: true,
          images: ['https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=600&auto=format&fit=crop&q=80'],
        },
      ],
    },
    {
      title: 'ChhotaBhai Bassheads 220',
      slug: 'chhotabhai-bassheads-220',
      description: 'Super Extra Bass In-Ear Wired Earphones with Passive Noise Isolation & In-line Mic.',
      category: audioCat._id,
      brand: 'ChhotaBhai',
      badge: 'None',
      specifications: { Feature: 'Noise Isolation' },
      ratings: { averageRating: 4.8, totalReviews: 890 },
      isFeatured: true,
      isActive: true,
      variants: [
        {
          sku: 'CHHOTA-BH-220',
          colorName: 'Midnight Black',
          colorCode: '#111111',
          mrp: 999,
          sellingPrice: 899,
          stockQuantity: 200,
          isAvailable: true,
          images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'],
        },
      ],
    },
    {
      title: 'ChhotaBhai Bassheads 110',
      slug: 'chhotabhai-bassheads-110',
      description: 'Angled In-Ear Wired Earphones with Powerful 10mm Drivers & In-line Microphone.',
      category: audioCat._id,
      brand: 'ChhotaBhai',
      badge: '🚀 Bestseller',
      specifications: { Feature: 'In-Line Microphone' },
      ratings: { averageRating: 5.0, totalReviews: 1250 },
      isFeatured: true,
      isActive: true,
      variants: [
        {
          sku: 'CHHOTA-BH-110',
          colorName: 'Arctic White',
          colorCode: '#ffffff',
          mrp: 999,
          sellingPrice: 849,
          stockQuantity: 250,
          isAvailable: true,
          images: ['https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&auto=format&fit=crop&q=80'],
        },
      ],
    },
  ];

  for (const item of items) {
    await prodCol.updateOne(
      { slug: item.slug },
      { $set: { ...item, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
  }

  console.log('Successfully upserted ChhotaBhai showcase products!');
  await mongoose.disconnect();
}

run().catch(console.error);
