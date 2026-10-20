/**
 * Urban Bites — database seed
 * Run: bun prisma/seed.ts
 * Creates categories, 20 products (prices in paise), test accounts,
 * coupons, settings, sample reviews and historical orders.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

// helpers — all prices authored in rupees for readability, stored as paise
const R = (rupees: number) => Math.round(rupees * 100)

type OptGroup = {
  group: string
  required: boolean
  multi: boolean
  choices: { label: string; price: number }[] // price in paise
}

const sizeGroup = (base: string, large: string, up: number): OptGroup => ({
  group: 'Size',
  required: true,
  multi: false,
  choices: [
    { label: base, price: 0 },
    { label: large, price: R(up) },
  ],
})

const addonGroup = (choices: [string, number][]): OptGroup => ({
  group: 'Add-ons',
  required: false,
  multi: true,
  choices: choices.map(([label, price]) => ({ label, price: R(price) })),
})

async function main() {
  console.log('Seeding Urban Bites…')

  // wipe in dependency order (idempotent seed)
  await db.payment.deleteMany()
  await db.orderItem.deleteMany()
  await db.order.deleteMany()
  await db.cartItem.deleteMany()
  await db.review.deleteMany()
  await db.favorite.deleteMany()
  await db.newsletterSubscriber.deleteMany()
  await db.contactMessage.deleteMany()
  await db.coupon.deleteMany()
  await db.productImage.deleteMany()
  await db.product.deleteMany()
  await db.address.deleteMany()
  await db.user.deleteMany()
  await db.category.deleteMany()
  await db.restaurantSettings.deleteMany()

  // ---------------------------------------------------------------- users
  const adminPass = await bcrypt.hash('Admin@1234', 10)
  const custPass = await bcrypt.hash('Customer@123', 10)

  const admin = await db.user.create({
    data: { name: 'Urban Admin', email: 'admin@urbanbites.com', passwordHash: adminPass, role: 'ADMIN', phone: '+91 90000 00001' },
  })
  const priya = await db.user.create({
    data: { name: 'Priya Sharma', email: 'priya@example.com', passwordHash: custPass, role: 'CUSTOMER', phone: '+91 90000 00002' },
  })
  const arjun = await db.user.create({
    data: { name: 'Arjun Mehta', email: 'arjun@example.com', passwordHash: custPass, role: 'CUSTOMER', phone: '+91 90000 00003' },
  })
  const sara = await db.user.create({
    data: { name: 'Sara Khan', email: 'sara@example.com', passwordHash: custPass, role: 'CUSTOMER', phone: '+91 90000 00004' },
  })

  await db.address.createMany({
    data: [
      {
        userId: priya.id, label: 'Home', isDefault: true,
        fullText: 'B-702, Sunrise Apartments, Linking Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400050', phone: '+91 90000 00002',
      },
      {
        userId: priya.id, label: 'Work',
        fullText: '4th Floor, Prism Tower, Andheri East', city: 'Mumbai', state: 'Maharashtra', pincode: '400069', phone: '+91 90000 00002',
      },
      {
        userId: arjun.id, label: 'Home', isDefault: true,
        fullText: '12, Palm Grove, Carter Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400050', phone: '+91 90000 00003',
      },
    ],
  })

  // ---------------------------------------------------------------- categories
  const catData = [
    { name: 'Burgers', slug: 'burgers', description: 'Flame-grilled patties stacked with bold sauces', image: '/images/cat-burgers.png', sortOrder: 1 },
    { name: 'Pizza', slug: 'pizza', description: 'Wood-fired crusts with molten cheese', image: '/images/cat-pizza.png', sortOrder: 2 },
    { name: 'Fried Chicken', slug: 'fried-chicken', description: 'Crunchy, juicy, dangerously spiced', image: '/images/cat-chicken.png', sortOrder: 3 },
    { name: 'Wraps', slug: 'wraps', description: 'Grilled tortillas rolled around smoky fillings', image: '/images/cat-wraps.png', sortOrder: 4 },
    { name: 'Pasta', slug: 'pasta', description: 'Silky alfredo and fiery arrabbiata', image: '/images/cat-pasta.png', sortOrder: 5 },
    { name: 'Desserts', slug: 'desserts', description: 'Molten, creamy, utterly indulgent', image: '/images/cat-desserts.png', sortOrder: 6 },
    { name: 'Drinks', slug: 'drinks', description: 'Frosty coolers and thick shakes', image: '/images/cat-drinks.png', sortOrder: 7 },
    { name: 'Combos', slug: 'combos', description: 'Full meals priced for the hungry', image: '/images/cat-combos.png', sortOrder: 8 },
  ]
  const cats: Record<string, string> = {}
  for (const c of catData) {
    const row = await db.category.create({ data: c })
    cats[c.slug] = row.id
  }

  // ---------------------------------------------------------------- products
  type P = {
    name: string; slug: string; cat: string; price: number; compare?: number; image: string;
    isVeg?: boolean; spice?: number; featured?: boolean; sold?: number; rating?: [number, number];
    desc: string; ingredients: string[]; allergens?: string[]; options?: OptGroup[];
  }

  const products: P[] = [
    {
      name: 'Classic Smash Burger', slug: 'classic-smash-burger', cat: 'burgers', price: 249, compare: 299, image: '/images/p-classic-smash.png',
      isVeg: false, spice: 1, featured: true, sold: 512, rating: [4.6, 214],
      desc: 'A smash-seared beef patty with melted American cheese, house pickles, caramelised onions and smoky burger sauce on a toasted sesame bun.',
      ingredients: ['Beef patty', 'American cheese', 'Pickles', 'Caramelised onions', 'Burger sauce', 'Sesame bun'],
      allergens: ['Gluten', 'Dairy', 'Sesame'],
      options: [sizeGroup('Single Patty', 'Double Patty', 90), addonGroup([['Extra cheese', 30], ['Bacon strips', 60], ['Jalapeños', 20]])],
    },
    {
      name: 'Double Cheese Blaze Burger', slug: 'double-cheese-blaze', cat: 'burgers', price: 349, compare: 429, image: '/images/p-double-cheese-blaze.png',
      isVeg: false, spice: 3, featured: true, sold: 623, rating: [4.8, 341],
      desc: 'Our signature heat bomb — two flame-grilled patties, double cheddar, blazing peri sauce, grilled jalapeños and crispy onions.',
      ingredients: ['2 Beef patties', 'Cheddar cheese', 'Peri peri sauce', 'Jalapeños', 'Crispy onions', 'Brioche bun'],
      allergens: ['Gluten', 'Dairy', 'Egg'],
      options: [sizeGroup('Single Patty', 'Triple Patty', 120), addonGroup([['Extra cheddar', 35], ['Ghost pepper mayo', 25]])],
    },
    {
      name: 'Peri Peri Chicken Burger', slug: 'peri-peri-chicken-burger', cat: 'burgers', price: 299, image: '/images/p-peri-peri-chicken.png',
      isVeg: false, spice: 2, featured: true, sold: 448, rating: [4.5, 198],
      desc: 'Crispy fried chicken thigh glazed in fiery peri peri, cool garlic mayo, crunchy lettuce and a brioche bun built to hold it together.',
      ingredients: ['Crispy chicken thigh', 'Peri peri glaze', 'Garlic mayo', 'Lettuce', 'Brioche bun'],
      allergens: ['Gluten', 'Dairy', 'Egg'],
      options: [addonGroup([['Extra peri drizzle', 20], ['Cheese slice', 30]])],
    },
    {
      name: 'Crispy Veg Supreme Burger', slug: 'crispy-veg-supreme', cat: 'burgers', price: 229, image: '/images/p-veg-supreme.png',
      isVeg: true, spice: 1, sold: 389, rating: [4.4, 156],
      desc: 'Golden-crisp potato and pea patty, melted cheese, fresh tomato, onion rings and creamy mint mayo in a soft sesame bun.',
      ingredients: ['Potato-pea patty', 'Processed cheese', 'Tomato', 'Onion rings', 'Mint mayo', 'Sesame bun'],
      allergens: ['Gluten', 'Dairy'],
      options: [addonGroup([['Extra patty', 60], ['Cheese slice', 30]])],
    },
    {
      name: 'Margherita Classic', slug: 'margherita-classic', cat: 'pizza', price: 299, compare: 349, image: '/images/p-margherita.png',
      isVeg: true, spice: 0, sold: 402, rating: [4.5, 187],
      desc: 'San Marzano tomato sauce, fresh mozzarella and torn basil on a charred wood-fired crust. Simple, done perfectly.',
      ingredients: ['Tomato sauce', 'Mozzarella', 'Basil', 'Olive oil', 'Sourdough crust'],
      allergens: ['Gluten', 'Dairy'],
      options: [{
        group: 'Size', required: true, multi: false,
        choices: [{ label: '10 inch', price: 0 }, { label: '12 inch', price: R(110) }, { label: '14 inch', price: R(220) }],
      }, addonGroup([['Extra cheese', 50], ['Olives', 30]])],
    },
    {
      name: 'Pepperoni Feast', slug: 'pepperoni-feast', cat: 'pizza', price: 449, image: '/images/p-pepperoni-feast.png',
      isVeg: false, spice: 1, featured: true, sold: 531, rating: [4.7, 264],
      desc: 'Double layer of curled pepperoni cups pooled with flavour over bubbling mozzarella. A meat lover’s dream.',
      ingredients: ['Pepperoni', 'Mozzarella', 'Tomato sauce', 'Oregano'],
      allergens: ['Gluten', 'Dairy'],
      options: [{
        group: 'Size', required: true, multi: false,
        choices: [{ label: '10 inch', price: 0 }, { label: '12 inch', price: R(110) }, { label: '14 inch', price: R(220) }],
      }, addonGroup([['Stuffed cheese crust', 90], ['Chilli flakes pack', 10]])],
    },
    {
      name: 'Farmhouse Veggie', slug: 'farmhouse-veggie', cat: 'pizza', price: 379, image: '/images/p-farmhouse.png',
      isVeg: true, spice: 0, sold: 276, rating: [4.4, 132],
      desc: 'Loaded with capsicum, onions, sweet corn, mushrooms and juicy tomatoes over herbed tomato sauce.',
      ingredients: ['Capsicum', 'Onion', 'Sweet corn', 'Mushroom', 'Tomato', 'Mozzarella'],
      allergens: ['Gluten', 'Dairy'],
      options: [{
        group: 'Size', required: true, multi: false,
        choices: [{ label: '10 inch', price: 0 }, { label: '12 inch', price: R(110) }],
      }],
    },
    {
      name: 'Hot & Crispy Chicken Bucket', slug: 'hot-crispy-bucket', cat: 'fried-chicken', price: 499, compare: 599, image: '/images/p-crispy-bucket.png',
      isVeg: false, spice: 2, featured: true, sold: 587, rating: [4.7, 302],
      desc: 'Eight pieces of double-dredged chicken with a craggy, glass-shatter crust and juicy interior. Tossed in your choice of spice.',
      ingredients: ['Chicken (8 pc)', 'Signature spice dredge', 'Buttermilk brine'],
      allergens: ['Gluten', 'Dairy'],
      options: [{
        group: 'Spice level', required: true, multi: false,
        choices: [{ label: 'Hot & Crispy', price: 0 }, { label: 'Fiery Peri', price: 0 }, { label: 'Smoky BBQ', price: R(20) }],
      }, addonGroup([['Dips (2)', 40], ['Extra gravy', 30]])],
    },
    {
      name: 'Chicken Zinger Wings', slug: 'chicken-zinger-wings', cat: 'fried-chicken', price: 279, image: '/images/p-zinger-wings.png',
      isVeg: false, spice: 2, sold: 366, rating: [4.6, 175],
      desc: 'Six sticky-hot wings lacquered in honey-chilli glaze, served with a cooling ranch dip.',
      ingredients: ['Chicken wings (6 pc)', 'Honey chilli glaze', 'Ranch dip'],
      allergens: ['Gluten', 'Dairy', 'Soy'],
      options: [addonGroup([['Extra ranch', 25], ['Make it 10 pc', 150]])],
    },
    {
      name: 'Paneer Tikka Wrap', slug: 'paneer-tikka-wrap', cat: 'wraps', price: 249, image: '/images/p-paneer-tikka-wrap.png',
      isVeg: true, spice: 2, sold: 341, rating: [4.5, 148],
      desc: 'Char-grilled tandoori paneer, pickled onions and mint chutney rolled in a flaky grilled paratha.',
      ingredients: ['Tandoori paneer', 'Pickled onion', 'Mint chutney', 'Paratha'],
      allergens: ['Gluten', 'Dairy'],
      options: [addonGroup([['Extra paneer', 50], ['Cheese slice', 30]])],
    },
    {
      name: 'Chicken Kebab Wrap', slug: 'chicken-kebab-wrap', cat: 'wraps', price: 269, image: '/images/p-chicken-kebab-wrap.png',
      isVeg: false, spice: 2, sold: 415, rating: [4.6, 193],
      desc: 'Smoky seekh kebab, garlic toum and crunchy slaw rolled in a warm tortilla and pressed till crisp.',
      ingredients: ['Chicken seekh kebab', 'Garlic toum', 'Slaw', 'Tortilla'],
      allergens: ['Gluten', 'Egg'],
      options: [addonGroup([['Double kebab', 70], ['Hot sauce', 15]])],
    },
    {
      name: 'Alfredo White Sauce Pasta', slug: 'alfredo-pasta', cat: 'pasta', price: 319, image: '/images/p-alfredo.png',
      isVeg: false, spice: 0, featured: true, sold: 298, rating: [4.6, 141],
      desc: 'Penne folded through slow-reduced garlic alfredo with grilled chicken strips and parmesan shavings.',
      ingredients: ['Penne', 'Cream', 'Garlic', 'Grilled chicken', 'Parmesan'],
      allergens: ['Gluten', 'Dairy'],
      options: [sizeGroup('Regular', 'Large', 90), addonGroup([['Grilled chicken', 70], ['Garlic bread', 50]])],
    },
    {
      name: 'Arrabbiata Penne', slug: 'arrabbiata-penne', cat: 'pasta', price: 289, image: '/images/p-arrabbiata.png',
      isVeg: true, spice: 2, sold: 210, rating: [4.3, 96],
      desc: 'Fiery tomato-chilli arrabbiata with basil, chilli flakes and a generous snowfall of parmesan.',
      ingredients: ['Penne', 'Tomato-chilli sauce', 'Basil', 'Parmesan'],
      allergens: ['Gluten', 'Dairy'],
      options: [sizeGroup('Regular', 'Large', 90)],
    },
    {
      name: 'Choco Lava Cake', slug: 'choco-lava-cake', cat: 'desserts', price: 149, image: '/images/p-choco-lava.png',
      isVeg: true, spice: 0, featured: true, sold: 604, rating: [4.8, 356],
      desc: 'Warm dark chocolate cake with a molten centre that flows at first spoon. Served with berries.',
      ingredients: ['Dark chocolate', 'Butter', 'Egg', 'Berries'],
      allergens: ['Gluten', 'Dairy', 'Egg'],
    },
    {
      name: 'Gulab Jamun Cheesecake', slug: 'gulab-jamun-cheesecake', cat: 'desserts', price: 179, image: '/images/p-gulab-jamun-cheesecake.png',
      isVeg: true, spice: 0, sold: 187, rating: [4.7, 88],
      desc: 'New York-style baked cheesecake swirled with saffron syrup and gulab jamun, finished with pistachio dust.',
      ingredients: ['Cream cheese', 'Gulab jamun', 'Saffron syrup', 'Pistachio'],
      allergens: ['Dairy', 'Nuts', 'Gluten'],
    },
    {
      name: 'Virgin Mojito', slug: 'virgin-mojito', cat: 'drinks', price: 129, image: '/images/p-virgin-mojito.png',
      isVeg: true, spice: 0, sold: 452, rating: [4.5, 167],
      desc: 'Muddled lime and mint over crushed ice, topped with fizzing soda. The eternal refresher.',
      ingredients: ['Lime', 'Mint', 'Soda', 'Cane sugar'],
      options: [sizeGroup('Regular', 'Large', 40)],
    },
    {
      name: 'Thick Belgian Choco Shake', slug: 'belgian-choco-shake', cat: 'drinks', price: 189, image: '/images/p-choco-shake.png',
      isVeg: true, spice: 0, featured: true, sold: 498, rating: [4.7, 203],
      desc: 'Blended thick with Belgian couverture chocolate and vanilla gelato, crowned with whipped cream.',
      ingredients: ['Belgian chocolate', 'Vanilla gelato', 'Milk', 'Whipped cream'],
      allergens: ['Dairy'],
      options: [sizeGroup('Regular', 'Large', 50), addonGroup([['Extra whipped cream', 20], ['Choco drizzle', 15]])],
    },
    {
      name: 'Masala Lemonade', slug: 'masala-lemonade', cat: 'drinks', price: 99, image: '/images/p-masala-lemonade.png',
      isVeg: true, spice: 1, sold: 329, rating: [4.4, 112],
      desc: 'Desi-style sparkling lemonade with a black salt and chaat masala kick that wakes up every flavour.',
      ingredients: ['Lemon', 'Chaat masala', 'Black salt', 'Soda'],
    },
    {
      name: 'Blaze Duo Combo', slug: 'blaze-duo-combo', cat: 'combos', price: 429, compare: 520, image: '/images/p-blaze-duo.png',
      isVeg: false, spice: 2, featured: true, sold: 466, rating: [4.6, 178],
      desc: 'One Double Cheese Blaze Burger + peri fries + any regular beverage. Built for one very hungry human.',
      ingredients: ['Blaze burger', 'Peri peri fries', 'Regular beverage'],
      allergens: ['Gluten', 'Dairy'],
      options: [{
        group: 'Beverage', required: true, multi: false,
        choices: [{ label: 'Masala Lemonade', price: 0 }, { label: 'Virgin Mojito', price: R(20) }, { label: 'Choco Shake', price: R(60) }],
      }],
    },
    {
      name: 'Family Feast Combo', slug: 'family-feast-combo', cat: 'combos', price: 999, compare: 1299, image: '/images/p-family-feast.png',
      isVeg: false, spice: 1, featured: true, sold: 245, rating: [4.8, 134],
      desc: '2 burgers + 4 pc fried chicken + loaded fries + 10" pizza + 4 beverages. Feeds a family of four, generously.',
      ingredients: ['2 Burgers', 'Fried chicken (4 pc)', 'Loaded fries', 'Pizza 10 inch', '4 Beverages'],
      allergens: ['Gluten', 'Dairy', 'Egg'],
      options: [{
        group: 'Beverages', required: true, multi: false,
        choices: [{ label: '4 × Masala Lemonade', price: 0 }, { label: '4 × Virgin Mojito', price: R(80) }],
      }],
    },
  ]

  const productIdBySlug: Record<string, string> = {}
  for (const p of products) {
    const row = await db.product.create({
      data: {
        name: p.name, slug: p.slug, description: p.desc, price: R(p.price), comparePrice: p.compare ? R(p.compare) : null,
        categoryId: cats[p.cat], image: p.image, isVeg: p.isVeg ?? true, spiceLevel: p.spice ?? 0,
        ingredients: JSON.stringify(p.ingredients), allergens: JSON.stringify(p.allergens ?? []),
        options: JSON.stringify(p.options ?? []), rating: p.rating?.[0] ?? 4.3, ratingCount: p.rating?.[1] ?? 50,
        isAvailable: true, isFeatured: p.featured ?? false, soldCount: p.sold ?? 100,
      },
    })
    productIdBySlug[p.slug] = row.id
    await db.productImage.create({ data: { productId: row.id, url: p.image, alt: p.name, sortOrder: 0 } })
  }

  // ---------------------------------------------------------------- coupons
  await db.coupon.createMany({
    data: [
      { code: 'WELCOME50', description: 'Flat ₹50 off on orders above ₹299', type: 'FLAT', value: R(50), minOrderValue: R(299), isActive: true, createdById: admin.id },
      { code: 'URBAN20', description: '20% off up to ₹150 on orders above ₹399', type: 'PERCENT', value: 20, minOrderValue: R(399), maxDiscount: R(150), isActive: true, createdById: admin.id },
      { code: 'FLAT100', description: 'Flat ₹100 off on orders above ₹499', type: 'FLAT', value: R(100), minOrderValue: R(499), isActive: true, createdById: admin.id },
    ],
  })

  // ---------------------------------------------------------------- settings
  await db.restaurantSettings.create({
    data: {
      id: 'main',
      offerTitle: 'FLAT 20% OFF',
      offerText: 'Craving something bold? Use code URBAN20 and get flat 20% off up to ₹150 on orders above ₹399.',
      offerCode: 'URBAN20',
      offerDiscount: 20,
    },
  })

  // ---------------------------------------------------------------- reviews
  const reviewSeed: [string, string, string, number, string][] = [
    ['priya', 'double-cheese-blaze', 'Absolute fire 🔥', 5, 'The double patty with peri sauce is lethal in the best way. Arrived hot in 28 minutes.'],
    ['arjun', 'double-cheese-blaze', 'Best burger in town', 5, 'Cheese pull was unreal. Packaging kept everything intact, zero sogginess.'],
    ['sara', 'double-cheese-blaze', 'Spicy but balanced', 4, 'Great heat without killing flavour. Would love slightly more sauce on the side.'],
    ['priya', 'hot-crispy-bucket', 'Crunch that echoes', 5, 'The crust actually shatters. Eight pieces were gone before the game started.'],
    ['arjun', 'hot-crispy-bucket', 'Worth every rupee', 4, 'Juicy inside, crispy outside. Fiery peri variant is genuinely spicy.'],
    ['sara', 'choco-lava-cake', 'Molten perfection', 5, 'That centre flows like a waterfall. Order two, trust me.'],
    ['priya', 'belgian-choco-shake', 'Thick like a dessert', 5, 'Barely fits the straw — exactly how a shake should be.'],
    ['arjun', 'pepperoni-feast', 'Pepperoni cups!', 5, 'Crispy pepperoni edges full of flavour. 12 inch fed me twice.'],
    ['sara', 'paneer-tikka-wrap', 'Smoky and fresh', 4, 'Paneer was charred beautifully, mint chutney brightened everything up.'],
    ['priya', 'blaze-duo-combo', 'Killer value', 5, 'Burger + fries + shake under ₹450 can’t be beaten.'],
    ['arjun', 'margherita-classic', 'Simple done right', 4, 'Char on the crust, fresh basil. A perfect comfort pizza.'],
    ['sara', 'peri-peri-chicken-burger', 'Crispy and juicy', 4, 'The glaze clings to every bite. Ask for extra napkins!'],
  ]
  const userIds: Record<string, string> = { priya: priya.id, arjun: arjun.id, sara: sara.id }
  for (const [user, slug, title, rating, comment] of reviewSeed) {
    await db.review.create({
      data: { userId: userIds[user], productId: productIdBySlug[slug], rating, title, comment, isApproved: true },
    })
  }

  await db.newsletterSubscriber.createMany({
    data: [{ email: 'priya@example.com' }, { email: 'arjun@example.com' }],
  })

  // ---------------------------------------------------------------- historical orders (for admin dashboard)
  const settings = { deliveryFee: R(39), taxPercent: 5, free: R(599) }
  const makeOrder = async (
    user: { id: string; name: string; phone: string },
    addressObj: string,
    items: { slug: string; qty: number; options?: { label: string; price: number }[] }[],
    status: string,
    paymentStatus: string,
    method: string,
    daysAgo: number,
    couponCode?: string,
    discount = 0,
  ) => {
    let subtotal = 0
    const rows = items.map((it) => {
      const p = products.find((x) => x.slug === it.slug)!
      const optPrice = (it.options ?? []).reduce((s, o) => s + o.price, 0)
      const unit = R(p.price) + optPrice
      subtotal += unit * it.qty
      return { slug: it.slug, qty: it.qty, unit, options: it.options ?? [], name: p.name, image: p.image }
    })
    const deliveryFee = subtotal >= settings.free ? 0 : settings.deliveryFee
    const tax = Math.round((subtotal - discount) * (settings.taxPercent / 100))
    const total = subtotal - discount + deliveryFee + tax
    const placedAt = new Date(Date.now() - daysAgo * 24 * 3600 * 1000)
    const order = await db.order.create({
      data: {
        orderNumber: `UB${placedAt.getTime().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`,
        userId: user.id, status, paymentStatus, paymentMethod: method,
        subtotal, discount, deliveryFee, tax, total, couponCode: couponCode ?? null,
        address: JSON.stringify(addressObj), contactName: user.name, contactPhone: user.phone,
        etaMinutes: 35, placedAt,
        deliveredAt: status === 'DELIVERED' ? new Date(placedAt.getTime() + 40 * 60000) : null,
        items: {
          create: rows.map((r) => ({
            productId: productIdBySlug[r.slug], name: r.name, image: r.image,
            unitPrice: r.unit, quantity: r.qty, options: JSON.stringify(r.options), lineTotal: r.unit * r.qty,
          })),
        },
      },
    })
    if (paymentStatus === 'PAID') {
      await db.payment.create({
        data: {
          orderId: order.id, provider: method === 'RAZORPAY' ? 'RAZORPAY' : 'RAZORPAY_DEV',
          providerOrderId: `order_seed_${order.id.slice(-8)}`, providerPaymentId: `pay_seed_${order.id.slice(-8)}`,
          amount: total, status: 'PAID', method: 'UPI', idempotencyKey: `seed-${order.id}`,
        },
      })
    }
  }

  const addr = (line: string, pin: string, phone: string) =>
    JSON.stringify({ label: 'Home', fullText: line, city: 'Mumbai', state: 'Maharashtra', pincode: pin, phone })

  await makeOrder({ id: priya.id, name: 'Priya Sharma', phone: '+91 90000 00002' },
    addr('B-702, Sunrise Apartments, Linking Road', '400050', '+91 90000 00002'),
    [{ slug: 'double-cheese-blaze', qty: 1, options: [{ label: 'Single Patty', price: 0 }] }, { slug: 'belgian-choco-shake', qty: 1 }],
    'DELIVERED', 'PAID', 'RAZORPAY', 6)

  await makeOrder({ id: arjun.id, name: 'Arjun Mehta', phone: '+91 90000 00003' },
    addr('12, Palm Grove, Carter Road', '400050', '+91 90000 00003'),
    [{ slug: 'hot-crispy-bucket', qty: 1, options: [{ label: 'Fiery Peri', price: 0 }] }, { slug: 'virgin-mojito', qty: 2 }],
    'DELIVERED', 'PAID', 'RAZORPAY', 4, 'URBAN20', R(150))

  await makeOrder({ id: priya.id, name: 'Priya Sharma', phone: '+91 90000 00002' },
    addr('4th Floor, Prism Tower, Andheri East', '400069', '+91 90000 00002'),
    [{ slug: 'pepperoni-feast', qty: 1, options: [{ label: '12 inch', price: R(110) }] }],
    'OUT_FOR_DELIVERY', 'PAID', 'RAZORPAY', 0)

  await makeOrder({ id: sara.id, name: 'Sara Khan', phone: '+91 90000 00004' },
    addr('88, Hill Road, Bandra West', '400050', '+91 90000 00004'),
    [{ slug: 'choco-lava-cake', qty: 2 }, { slug: 'masala-lemonade', qty: 1 }],
    'CONFIRMED', 'COD_PENDING', 'COD', 0)

  console.log('Seed complete.')
  console.log('Admin    → admin@urbanbites.com / Admin@1234')
  console.log('Customer → priya@example.com / Customer@123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
