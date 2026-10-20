import { ok, route } from '@/lib/api'
import { getSettings, publicSettings } from '@/lib/catalog'

/** Public restaurant settings (fees, tax, COD toggle, offer, contact info). */
export const GET = route(async () => {
  const settings = await getSettings()
  return ok({ settings: publicSettings(settings) })
})
