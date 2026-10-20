/**
 * Urban Bites — batch food imagery generator
 * Generates hero, floating ingredients, category and product images
 * into public/images using z-ai-web-dev-sdk. Skips files that already exist.
 */
import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'
import path from 'path'

const OUT = '/home/z/my-project/public/images'
const LOG = '/home/z/my-project/scripts/gen-images.log'
const CONCURRENCY = 1

function log(msg: string) {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${msg}`
  fs.appendFileSync(LOG, line + '\n')
  process.stdout.write(line + '\n')
}

type Job = { file: string; prompt: string; size: string }

const STYLE =
  'professional food advertising photography, dramatic studio lighting, glossy and appetizing, hyper realistic, ultra detailed, sharp focus, vibrant colors, on a pure black background'

const jobs: Job[] = [
  // ---------- HERO ----------
  {
    file: 'hero-burger.png',
    size: '1024x1024',
    prompt: `A towering gourmet double cheeseburger with glossy sesame brioche bun, juicy flame-grilled beef patty, melting cheddar cheese drip, fresh lettuce and tomato, surrounded by floating ingredients frozen mid-air around the burger: tomato slices, red onion rings, cheese slices, jalapeño peppers, lettuce leaves and red sauce splash, ${STYLE}, centered composition with empty dark space around, cinematic commercial shot`,
  },
  // ---------- FLOATING INGREDIENTS (blended with screen mix-blend over dark bg) ----------
  {
    file: 'ing-tomato.png',
    size: '1024x1024',
    prompt: `One single juicy ripe tomato slice floating at a slight angle with tiny water droplets and seeds visible, ${STYLE}, subject perfectly centered occupying 40% of frame`,
  },
  {
    file: 'ing-onion.png',
    size: '1024x1024',
    prompt: `Three crisp red onion rings stacked and floating with slight separation, purple-white layers visible, ${STYLE}, subject centered occupying 40% of frame`,
  },
  {
    file: 'ing-cheese.png',
    size: '1024x1024',
    prompt: `A single melting cheddar cheese slice bent into a wave shape with a cheese drip, ${STYLE}, subject centered occupying 40% of frame`,
  },
  {
    file: 'ing-chili.png',
    size: '1024x1024',
    prompt: `Two fresh green jalapeño peppers and one red chili floating with a tiny flame flicker beneath them, ${STYLE}, subject centered occupying 35% of frame`,
  },
  {
    file: 'ing-lettuce.png',
    size: '1024x1024',
    prompt: `A crisp ruffled green lettuce leaf floating and gently curled, water droplets on it, ${STYLE}, subject centered occupying 45% of frame`,
  },
  {
    file: 'ing-sauce.png',
    size: '1024x1024',
    prompt: `A dynamic swirl splash of spicy red sriracha ketchup sauce frozen mid-air, glossy liquid ribbon, ${STYLE}, subject centered occupying 50% of frame`,
  },
  // ---------- CATEGORIES ----------
  { file: 'cat-burgers.png', size: '1024x1024', prompt: `A juicy stacked cheeseburger with dripping melted cheese and sesame bun, ${STYLE}` },
  { file: 'cat-pizza.png', size: '1024x1024', prompt: `A whole wood-fired pepperoni pizza with cheese pull slice slightly lifted, ${STYLE}` },
  { file: 'cat-chicken.png', size: '1024x1024', prompt: `A bucket of crispy golden fried chicken pieces with steam, crunchy craggy coating, ${STYLE}` },
  { file: 'cat-wraps.png', size: '1024x1024', prompt: `A grilled tortilla wrap cut in half showing creamy paneer and veggie filling, wrapped in paper, ${STYLE}` },
  { file: 'cat-pasta.png', size: '1024x1024', prompt: `A bowl of creamy alfredo penne pasta with parmesan shavings and basil, steam rising, ${STYLE}` },
  { file: 'cat-desserts.png', size: '1024x1024', prompt: `A molten chocolate lava cake with flowing chocolate center, dusted cocoa, a scoop of vanilla ice cream beside it, ${STYLE}` },
  { file: 'cat-drinks.png', size: '1024x1024', prompt: `A tall glass of frothy chocolate milkshake with whipped cream and a cold mojito with lime and mint beside it, condensation droplets, ${STYLE}` },
  { file: 'cat-combos.png', size: '1024x1024', prompt: `A food combo spread: burger, french fries in red carton, chicken wings and a cold drink arranged together, ${STYLE}` },
  // ---------- PRODUCTS: BURGERS ----------
  { file: 'p-classic-smash.png', size: '1024x1024', prompt: `A classic smash burger single beef patty with melted american cheese, pickles, onions on a toasted sesame bun, ${STYLE}` },
  { file: 'p-double-cheese-blaze.png', size: '1024x1024', prompt: `A fiery double cheeseburger with two flame grilled patties, double melted cheddar, spicy red sauce dripping, grilled jalapeños, ${STYLE}` },
  { file: 'p-peri-peri-chicken.png', size: '1024x1024', prompt: `A crispy fried chicken burger with peri peri spicy glaze, lettuce and garlic mayo dripping, ${STYLE}` },
  { file: 'p-veg-supreme.png', size: '1024x1024', prompt: `A tall crispy veg burger with golden fried potato patty, cheese, tomato, onion rings and creamy sauce, ${STYLE}` },
  // ---------- PRODUCTS: PIZZA ----------
  { file: 'p-margherita.png', size: '1024x1024', prompt: `A classic margherita pizza with fresh mozzarella, tomato sauce and basil leaves on charred crust, top-down view, ${STYLE}` },
  { file: 'p-pepperoni-feast.png', size: '1024x1024', prompt: `An extra pepperoni pizza with crispy curled pepperoni cups and bubbly mozzarella, top-down view, ${STYLE}` },
  { file: 'p-farmhouse.png', size: '1024x1024', prompt: `A farmhouse veggie pizza loaded with capsicum, onion, corn, mushroom and tomatoes, top-down view, ${STYLE}` },
  // ---------- PRODUCTS: FRIED CHICKEN ----------
  { file: 'p-crispy-bucket.png', size: '1024x1024', prompt: `A red bucket overflowing with extra crispy golden fried chicken pieces, steam rising, ${STYLE}` },
  { file: 'p-zinger-wings.png', size: '1024x1024', prompt: `Six glossy spicy chicken wings glazed in hot sauce on a dark slate with dip, ${STYLE}` },
  // ---------- PRODUCTS: WRAPS ----------
  { file: 'p-paneer-tikka-wrap.png', size: '1024x1024', prompt: `A charred grilled wrap filled with tandoori paneer cubes, onions and mint sauce, cut open, ${STYLE}` },
  { file: 'p-chicken-kebab-wrap.png', size: '1024x1024', prompt: `A chicken seekh kebab wrap with garlic sauce and pickled onions in grilled tortilla, cut open, ${STYLE}` },
  // ---------- PRODUCTS: PASTA ----------
  { file: 'p-alfredo.png', size: '1024x1024', prompt: `Creamy white sauce alfredo penne pasta with grilled chicken strips and parsley in a dark bowl, ${STYLE}` },
  { file: 'p-arrabbiata.png', size: '1024x1024', prompt: `Spicy red arrabbiata penne pasta with chili flakes, parmesan and basil in a dark bowl, ${STYLE}` },
  // ---------- PRODUCTS: DESSERTS ----------
  { file: 'p-choco-lava.png', size: '1024x1024', prompt: `A molten chocolate lava cake with liquid chocolate flowing out, served on dark plate with berries, ${STYLE}` },
  { file: 'p-gulab-jamun-cheesecake.png', size: '1024x1024', prompt: `An Indian fusion gulab jamun cheesecake slice with syrup drizzle and pistachio crumbs, ${STYLE}` },
  // ---------- PRODUCTS: DRINKS ----------
  { file: 'p-virgin-mojito.png', size: '1024x1024', prompt: `A tall virgin mojito with crushed ice, lime wheels and mint sprig, condensation on glass, ${STYLE}` },
  { file: 'p-choco-shake.png', size: '1024x1024', prompt: `A thick belgian chocolate milkshake in a tall glass with whipped cream tower and chocolate shavings, ${STYLE}` },
  { file: 'p-masala-lemonade.png', size: '1024x1024', prompt: `A sparkling masala lemonade with chaat masala rim, lemon slices and mint, in a mason jar, ${STYLE}` },
  // ---------- PRODUCTS: COMBOS ----------
  { file: 'p-blaze-duo.png', size: '1024x1024', prompt: `A combo meal of one spicy cheeseburger, large french fries in red carton and a cola glass with ice, ${STYLE}` },
  { file: 'p-family-feast.png', size: '1024x1024', prompt: `A huge family feast spread: two burgers, fried chicken pieces, loaded fries, pizza slices and four drinks, ${STYLE}` },
  // ---------- OFFER BANNER ----------
  { file: 'offer-banner.png', size: '1440x720', prompt: `A dramatic wide banner photo of a giant juicy burger and flying fries and ingredients on the right side, motion and sauce splashes, lots of empty dark space on the left side for text, ${STYLE}, wide cinematic composition` },
]

async function generateOne(zai: any, job: Job, attempt = 1): Promise<boolean> {
  const outPath = path.join(OUT, job.file)
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 10000) {
    log(`SKIP ${job.file} (exists)`)
    return true
  }
  try {
    const res = await zai.images.generations.create({ prompt: job.prompt, size: job.size })
    const b64 = res?.data?.[0]?.base64
    if (!b64) throw new Error('empty base64 response')
    const buf = Buffer.from(b64, 'base64')
    if (buf.length < 10000) throw new Error('image too small, likely failed')
    fs.writeFileSync(outPath, buf)
    log(`OK ${job.file} (${(buf.length / 1024).toFixed(0)} KB)`)
    return true
  } catch (e: any) {
    log(`FAIL attempt ${attempt} ${job.file}: ${e?.message || e}`)
    if (attempt < 10) {
      const wait = e?.message?.includes('429') ? Math.min(30000, 8000 * attempt) : 3000 * attempt
      await new Promise((r) => setTimeout(r, wait))
      return generateOne(zai, job, attempt + 1)
    }
    return false
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  log(`=== image generation started (${jobs.length} jobs) ===`)
  const zai = await ZAI.create()
  const failed: string[] = []
  let idx = 0
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (idx < jobs.length) {
      const job = jobs[idx++]
      const ok = await generateOne(zai, job)
      if (!ok) failed.push(job.file)
    }
  })
  await Promise.all(workers)
  log(`DONE. generated=${jobs.length - failed.length}/${jobs.length} failed=[${failed.join(', ')}]`)
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
