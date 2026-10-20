/**
 * Urban Bites — API + unit test suite (bun test)
 *
 * Run:  bun test tests/api.test.ts
 * Requires the dev server on http://localhost:3000 (BASE_URL env overrides).
 * Uses the local SQLite database and the seeded catalog; creates its own
 * throwaway accounts and cleans nothing (harmless test_* rows).
 */
import { describe, test, expect, beforeAll } from 'bun:test'
import { computeSubtotal, computeCouponDiscount, computeTotals, canAdminTransition, canCustomerCancel } from '../src/lib/pricing'

const BASE = process.env.BASE_URL || 'http://localhost:3000'

interface Env {
  success: boolean
  data?: any
  error?: { code: string; message: string; details?: unknown }
}

async function call(method: string, path: string, body?: unknown, cookie?: string): Promise<{ res: Response; json: Env }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let json: Env
  try {
    json = await res.json()
  } catch {
    json = { success: false, error: { code: 'NO_JSON', message: 'non-json response' } }
  }
  return { res, json }
}

function setCookieOf(res: Response): string {
  const raw = res.headers.get('set-cookie') || ''
  const pair = raw.split(';')[0]
  return pair || ''
}

const rand = Math.random().toString(36).slice(2, 8)
const CUSTOMER = { name: `Test Runner ${rand}`, email: `runner-${rand}@test.com`, password: 'Runner@1234', phone: '9876543210' }

let customerCookie = ''
let adminCookie = ''
let blazeProductId = ''
let blazeOptions: { group: string; required: boolean; multi: boolean; choices: { label: string; price: number }[] }[] = []

/** required single-choice option labels for the blaze burger (e.g. Size → Single Patty) */
function blazeRequiredOptions(): string[] {
  return blazeOptions.filter((g) => g.required && !g.multi).map((g) => g.choices[0].label)
}

beforeAll(async () => {
  // customer
  const reg = await call('POST', '/api/auth/register', CUSTOMER)
  customerCookie = setCookieOf(reg.res)
  if (!customerCookie) {
    const log = await call('POST', '/api/auth/login', { email: CUSTOMER.email, password: CUSTOMER.password })
    customerCookie = setCookieOf(log.res)
  }
  // admin (seeded)
  const adm = await call('POST', '/api/auth/login', { email: 'admin@urbanbites.com', password: 'Admin@1234' })
  adminCookie = setCookieOf(adm.res)
  // product
  const prods = await call('GET', '/api/products?search=blaze&limit=1')
  blazeProductId = prods.json.data.products[0].id
  blazeOptions = prods.json.data.products[0].options
})

// ============================================================ pricing engine
describe('pricing engine (pure functions)', () => {
  test('subtotal sums unit price × quantity', () => {
    expect(computeSubtotal([{ unitPrice: 10000, quantity: 2 }, { unitPrice: 25000, quantity: 1 }])).toBe(45000)
  })

  test('flat coupon applies value, capped at subtotal', () => {
    const coupon = { code: 'F', type: 'FLAT' as const, value: 5000, minOrderValue: 0 }
    expect(computeCouponDiscount(coupon, 40000)).toBe(5000)
    expect(computeCouponDiscount(coupon, 2000)).toBe(2000)
  })

  test('percent coupon respects cap', () => {
    const coupon = { code: 'P', type: 'PERCENT' as const, value: 20, minOrderValue: 0, maxDiscount: 15000 }
    expect(computeCouponDiscount(coupon, 93800)).toBe(15000) // 20% of 938 = 187.6 → capped at 150
    expect(computeCouponDiscount({ ...coupon, maxDiscount: null }, 93800)).toBe(18760)
  })

  test('coupon below minimum order returns null', () => {
    const coupon = { code: 'M', type: 'FLAT' as const, value: 5000, minOrderValue: 29900 }
    expect(computeCouponDiscount(coupon, 29899)).toBe(null)
    expect(computeCouponDiscount(coupon, 29900)).toBe(5000)
  })

  test('totals: discount → free delivery threshold → tax on net', () => {
    const t = computeTotals({
      lines: [{ unitPrice: 46900, quantity: 2 }], // 938
      coupon: { code: 'URBAN20', type: 'PERCENT', value: 20, minOrderValue: 39900, maxDiscount: 15000 },
      deliveryFee: 3900,
      freeDeliveryThreshold: 59900,
      taxPercent: 5,
    })
    expect(t.subtotal).toBe(93800)
    expect(t.discount).toBe(15000)
    expect(t.deliveryFee).toBe(0) // net 788 ≥ 599
    expect(t.tax).toBe(3940) // 5% of 788
    expect(t.total).toBe(82740)
  })

  test('totals: paid delivery when below threshold', () => {
    const t = computeTotals({
      lines: [{ unitPrice: 24900, quantity: 1 }], // 249
      deliveryFee: 3900,
      freeDeliveryThreshold: 59900,
      taxPercent: 5,
    })
    expect(t.deliveryFee).toBe(3900)
    expect(t.tax).toBe(1245)
    expect(t.total).toBe(30045)
  })

  test('status transition rules', () => {
    expect(canAdminTransition('PLACED', 'CONFIRMED')).toBe(true)
    expect(canAdminTransition('PLACED', 'DELIVERED')).toBe(false)
    expect(canAdminTransition('DELIVERED', 'CANCELLED')).toBe(false)
    expect(canCustomerCancel('PLACED')).toBe(true)
    expect(canCustomerCancel('PREPARING')).toBe(false)
    expect(canCustomerCancel('DELIVERED')).toBe(false)
  })
})

// ============================================================ auth
describe('authentication & authorization', () => {
  test('register validates password strength', async () => {
    const { json } = await call('POST', '/api/auth/register', { name: 'Weak', email: `weak-${rand}@t.com`, password: 'short' })
    expect(json.success).toBe(false)
    expect(json.error?.code).toBe('VALIDATION_ERROR')
  })

  test('register rejects duplicate email', async () => {
    const { json } = await call('POST', '/api/auth/register', CUSTOMER)
    expect(json.success).toBe(false)
    expect(json.error?.code).toBe('EMAIL_TAKEN')
  })

  test('login rejects wrong password without enumeration', async () => {
    const { res, json } = await call('POST', '/api/auth/login', { email: CUSTOMER.email, password: 'WrongPass1' })
    expect(res.status).toBe(401)
    expect(json.error?.code).toBe('BAD_CREDENTIALS')
  })

  test('me requires auth', async () => {
    const { res } = await call('GET', '/api/auth/me')
    expect(res.status).toBe(401)
  })

  test('customer cannot access admin dashboard', async () => {
    const { res, json } = await call('GET', '/api/admin/dashboard', undefined, customerCookie)
    expect(res.status).toBe(403)
    expect(json.error?.code).toBe('FORBIDDEN')
  })

  test('admin can access admin dashboard', async () => {
    const { json } = await call('GET', '/api/admin/dashboard', undefined, adminCookie)
    expect(json.success).toBe(true)
    expect(json.data.stats.totalOrders).toBeGreaterThan(0)
  })

  test('logout clears session', async () => {
    const { json } = await call('POST', '/api/auth/logout')
    expect(json.success).toBe(true)
  })
})

// ============================================================ products
describe('product listing & filtering', () => {
  test('lists products with pagination envelope', async () => {
    const { json } = await call('GET', '/api/products?limit=5&page=1')
    expect(json.data.products.length).toBeLessThanOrEqual(5)
    expect(json.data.pagination.total).toBeGreaterThan(10)
  })

  test('search narrows results', async () => {
    const { json } = await call('GET', '/api/products?search=mojito')
    expect(json.data.products.length).toBe(1)
    expect(json.data.products[0].slug).toBe('virgin-mojito')
  })

  test('veg filter only returns vegetarian', async () => {
    const { json } = await call('GET', '/api/products?veg=true&limit=50')
    for (const p of json.data.products) expect(p.isVeg).toBe(true)
  })

  test('category filter works', async () => {
    const { json } = await call('GET', '/api/products?category=pizza&limit=50')
    expect(json.data.products.length).toBe(3)
  })

  test('price sorting asc/desc', async () => {
    const asc = await call('GET', '/api/products?sort=price_asc&limit=3')
    const prices = asc.json.data.products.map((p: { price: number }) => p.price)
    expect([...prices].sort((a, b) => a - b)).toEqual(prices)
    const desc = await call('GET', '/api/products?sort=price_desc&limit=3')
    const dprices = desc.json.data.products.map((p: { price: number }) => p.price)
    expect([...dprices].sort((a, b) => b - a)).toEqual(dprices)
  })

  test('product detail includes ingredients, allergens, options', async () => {
    const { json } = await call('GET', '/api/products/double-cheese-blaze')
    expect(json.data.product.ingredients.length).toBeGreaterThan(2)
    expect(json.data.product.allergens).toContain('Gluten')
    expect(json.data.product.options.length).toBeGreaterThan(0)
  })
})

// ============================================================ cart
describe('cart & server-side pricing', () => {
  test('guest cannot use cart', async () => {
    const { res } = await call('POST', '/api/cart', { productId: blazeProductId, quantity: 1 })
    expect(res.status).toBe(401)
  })

  test('rejects invalid option labels (no client-trusted prices)', async () => {
    const { res, json } = await call('POST', '/api/cart', { productId: blazeProductId, quantity: 1, options: ['Fake Option'] }, customerCookie)
    expect(res.status).toBe(400)
    expect(json.error?.code).toBe('BAD_OPTION')
  })

  test('add item with paid option prices unit price from DB', async () => {
    const triple = blazeOptions.find((g) => g.group === 'Size')?.choices.find((c) => c.label === 'Triple Patty')
    const { json } = await call('POST', '/api/cart', { productId: blazeProductId, quantity: 2, options: ['Triple Patty'] }, customerCookie)
    expect(json.success).toBe(true)
    const item = json.data.items[0]
    expect(item.quantity).toBe(2)
    expect(item.unitPrice).toBe(34900 + (triple?.price ?? 0))
    // free delivery kicks in above 599
    expect(json.data.totals.deliveryFee).toBe(0)
    // cleanup for next tests
    await call('DELETE', '/api/cart?all=1', undefined, customerCookie)
  })

  test('quantity update to 0 removes item', async () => {
    await call('POST', '/api/cart', { productId: blazeProductId, quantity: 1, options: blazeRequiredOptions() }, customerCookie)
    const cart = await call('GET', '/api/cart', undefined, customerCookie)
    const itemId = cart.json.data.items[0].id
    const { json } = await call('PATCH', '/api/cart', { itemId, quantity: 0 }, customerCookie)
    expect(json.data.items.length).toBe(0)
  })
})

// ============================================================ coupons & orders
describe('orders, coupons & payments', () => {
  test('order creation is idempotent (no duplicate orders)', async () => {
    await call('POST', '/api/cart', { productId: blazeProductId, quantity: 1, options: ['Triple Patty'] }, customerCookie)
    const body = {
      idempotencyKey: `test-${rand}-1`,
      address: { label: 'Home', fullText: '1 Test Street', city: 'Mumbai', state: 'Maharashtra', pincode: '400050', phone: '9876543210' },
      contactName: 'Test Runner',
      contactPhone: '9876543210',
      paymentMethod: 'RAZORPAY' as const,
      couponCode: 'URBAN20',
    }
    const first = await call('POST', '/api/orders', body, customerCookie)
    expect(first.json.success).toBe(true)
    const second = await call('POST', '/api/orders', body, customerCookie)
    expect(second.json.data.duplicate).toBe(true)
    expect(second.json.data.order.id).toBe(first.json.data.order.id)
    return { orderId: first.json.data.order.id as string }
  })

  test('order with coupon reduces total server-side', async () => {
    await call('POST', '/api/cart', { productId: blazeProductId, quantity: 1, options: ['Triple Patty'] }, customerCookie)
    const { json } = await call('POST', '/api/orders', {
      idempotencyKey: `test-${rand}-2`,
      address: { label: 'Home', fullText: '1 Test Street', city: 'Mumbai', state: 'Maharashtra', pincode: '400050', phone: '9876543210' },
      contactName: 'Test Runner',
      contactPhone: '9876543210',
      paymentMethod: 'COD' as const,
      couponCode: 'URBAN20',
    }, customerCookie)
    const o = json.data.order
    // subtotal 46900 → 20% discount = 9380 → net 37520 → delivery 3900 → tax 1876 → 43296
    expect(o.discount).toBe(9380)
    expect(o.deliveryFee).toBe(3900)
    expect(o.tax).toBe(1876)
    expect(o.total).toBe(43296)
    expect(o.paymentStatus).toBe('COD_PENDING')
  })

  test('payment verification rejects tampered signatures', async () => {
    await call('POST', '/api/cart', { productId: blazeProductId, quantity: 1, options: blazeRequiredOptions() }, customerCookie)
    const ord = await call('POST', '/api/orders', {
      idempotencyKey: `test-${rand}-3`,
      address: { label: 'Home', fullText: '1 Test Street', city: 'Mumbai', state: 'Maharashtra', pincode: '400050', phone: '9876543210' },
      contactName: 'Test Runner', contactPhone: '9876543210', paymentMethod: 'RAZORPAY' as const,
    }, customerCookie)
    const orderId = ord.json.data.order.id

    const gw = await call('POST', '/api/payments/razorpay/order', { orderId }, customerCookie)
    expect(gw.json.data.mode).toBe('simulated-dev') // keys are not configured in the sandbox
    const gatewayOrderId = gw.json.data.gatewayOrderId

    const sim = await call('POST', '/api/payments/razorpay/simulate', { gatewayOrderId, outcome: 'success' }, customerCookie)
    const { razorpay_payment_id, razorpay_signature } = sim.json.data

    const bad = await call('POST', '/api/payments/razorpay/verify', {
      razorpay_order_id: gatewayOrderId, razorpay_payment_id, razorpay_signature: '0'.repeat(64),
    }, customerCookie)
    expect(bad.res.status).toBe(400)
    expect(bad.json.error?.code).toBe('SIGNATURE_INVALID')

    const good = await call('POST', '/api/payments/razorpay/verify', {
      razorpay_order_id: gatewayOrderId, razorpay_payment_id, razorpay_signature,
    }, customerCookie)
    expect(good.json.data.verified).toBe(true)
    expect(good.json.data.order.paymentStatus).toBe('PAID')
    expect(good.json.data.order.status).toBe('CONFIRMED')

    const replay = await call('POST', '/api/payments/razorpay/verify', {
      razorpay_order_id: gatewayOrderId, razorpay_payment_id, razorpay_signature,
    }, customerCookie)
    expect(replay.json.data.alreadyProcessed).toBe(true)
  })

  test('customer cancellation refunds paid order', async () => {
    // find the last confirmed paid order of this customer
    const mine = await call('GET', '/api/orders/my?limit=5', undefined, customerCookie)
    const cancellable = mine.json.data.orders.find((o: { status: string; paymentStatus: string }) => o.status === 'CONFIRMED' && o.paymentStatus === 'PAID')
    expect(cancellable).toBeDefined()
    const { json } = await call('PATCH', `/api/orders/${cancellable.id}/cancel`, { reason: 'test cancel' }, customerCookie)
    expect(json.data.order.status).toBe('CANCELLED')
    expect(json.data.order.paymentStatus).toBe('REFUNDED')
  })

  test('cancellation refused after cooking starts', async () => {
    await call('POST', '/api/cart', { productId: blazeProductId, quantity: 1, options: blazeRequiredOptions() }, customerCookie)
    const ord = await call('POST', '/api/orders', {
      idempotencyKey: `test-${rand}-4`,
      address: { label: 'Home', fullText: '1 Test Street', city: 'Mumbai', state: 'Maharashtra', pincode: '400050', phone: '9876543210' },
      contactName: 'Test Runner', contactPhone: '9876543210', paymentMethod: 'COD' as const,
    }, customerCookie)
    const orderId = ord.json.data.order.id
    // admin confirms → customer can no longer cancel after PREPARING
    await call('PATCH', `/api/admin/orders/${orderId}/status`, { status: 'CONFIRMED' }, adminCookie)
    await call('PATCH', `/api/admin/orders/${orderId}/status`, { status: 'PREPARING' }, adminCookie)
    const { res, json } = await call('PATCH', `/api/orders/${orderId}/cancel`, { reason: 'too late' }, customerCookie)
    expect(res.status).toBe(400)
    expect(json.error?.code).toBe('NOT_CANCELLABLE')
  })

  test('admin cannot apply invalid status transitions', async () => {
    await call('POST', '/api/cart', { productId: blazeProductId, quantity: 1, options: blazeRequiredOptions() }, customerCookie)
    const ord = await call('POST', '/api/orders', {
      idempotencyKey: `test-${rand}-5`,
      address: { label: 'Home', fullText: '1 Test Street', city: 'Mumbai', state: 'Maharashtra', pincode: '400050', phone: '9876543210' },
      contactName: 'Test Runner', contactPhone: '9876543210', paymentMethod: 'COD' as const,
    }, customerCookie)
    const { res, json } = await call('PATCH', `/api/admin/orders/${ord.json.data.order.id}/status`, { status: 'DELIVERED' }, adminCookie)
    expect(res.status).toBe(400)
    expect(json.error?.code).toBe('INVALID_TRANSITION')
  })

  test('cross-user order access is forbidden', async () => {
    const mine = await call('GET', '/api/orders/my?limit=1', undefined, customerCookie)
    const id = mine.json.data.orders[0].id
    // priya (seeded customer, different session) must not read it
    const p = await call('POST', '/api/auth/login', { email: 'priya@example.com', password: 'Customer@123' })
    const priyaCookie = setCookieOf(p.res)
    const { res, json } = await call('GET', `/api/orders/${id}`, undefined, priyaCookie)
    expect(res.status).toBe(403)
    expect(json.error?.code).toBe('FORBIDDEN')
  })
})

// ============================================================ misc
describe('misc endpoints', () => {
  test('newsletter duplicate subscription rejected', async () => {
    const email = `news-${rand}@test.com`
    const first = await call('POST', '/api/newsletter', { email })
    expect(first.json.success).toBe(true)
    const second = await call('POST', '/api/newsletter', { email })
    expect(second.json.error?.code).toBe('ALREADY_SUBSCRIBED')
  })

  test('contact form validates message length', async () => {
    const { res } = await call('POST', '/api/contact', { name: 'T', email: 't@t.com', message: 'hi' })
    expect(res.status).toBe(400)
  })

  test('settings exposes fees and COD flag', async () => {
    const { json } = await call('GET', '/api/settings')
    expect(json.data.settings.deliveryFee).toBeTypeOf('number')
    expect(json.data.settings.codEnabled).toBeTypeOf('boolean')
  })

  test('coupon validation enforces minimum order', async () => {
    await call('DELETE', '/api/cart?all=1', undefined, customerCookie)
    const { res, json } = await call('POST', '/api/coupons/validate', { code: 'FLAT100' }, customerCookie)
    expect(res.status).toBe(400)
    expect(json.error?.code).toBe('COUPON_NOT_ELIGIBLE')
  })
})
