import { Router, type Router as RouterType } from 'express'

import { getHealth } from '@controllers/health.controller'

const router: RouterType = Router()

router.get('/health', getHealth)

export default router
