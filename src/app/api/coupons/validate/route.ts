import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { ApiError, ok, parseBody, route } from '@/lib/api'
import { validateCouponRaw } from '@/app/api/cart/route'
import { computeCouponDiscount } from '@/lib/pricing'
import { formatINR } from '@/lib/money'

const schema = z.object({ code: z.string().trim().min(2).max(30) })

export const POST = route(async (req: NextRequest) => {
  const user = await requireUser(req)
  const { code } = await parseBody(req, schema)

  const { coupon } = await validateCouponRaw(code)

  // compute against the user's live cart subtotal
  const cart = await requireActualSubtotal(user.id)
  const discount = computeCouponDiscount(coupon, cart)

  if (discount === null) {
    const needed = coupon.minOrderValue - cart
    throw new ApiError(
      400,
      needed > 0
        ? `Add ${formatINR(needed)} more to unlock ${coupon.code} (min order ${formatINR(coupon.minOrderValue)})`
        : `${coupon.code} cannot be applied to this cart`,
      'COUPON_NOT_ELIGIBLE',
    )
  }

  return ok({
    coupon,
    discount,
    message: `Coupon ${coupon.code} applied — you save ${formatINR(discount)}`,
  })
})

async function requireActualSubtotal(userId: string): Promise<number> {
  const items = await (await import('@/lib/db')).db.cartItem.findMany({
    where: { userId },
    include: { product: true },
  })
  return items.reduce((sum, i) => {
    const opts = JSON.parse(i.options || '[]') as { price: number }[]
    const unit = i.product.price + opts.reduce((s, o) => s + o.price, 0)
    return sum + unit * i.quantity
  }, 0)
}
