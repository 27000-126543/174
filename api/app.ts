import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import subjectRoutes from './routes/subjects.js'
import consentRoutes from './routes/consents.js'
import crfRoutes from './routes/crf.js'
import saeRoutes from './routes/sae.js'
import monitoringRoutes from './routes/monitoring.js'
import randomizationRoutes from './routes/randomization.js'
import ethicsRoutes from './routes/ethics.js'
import visitRoutes from './routes/visits.js'
import dataRoutes from './routes/data.js'
import performanceRoutes from './routes/performance.js'
import messageRoutes from './routes/messages.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/subjects', subjectRoutes)
app.use('/api/consents', consentRoutes)
app.use('/api/crf', crfRoutes)
app.use('/api/sae', saeRoutes)
app.use('/api/monitoring', monitoringRoutes)
app.use('/api/randomization', randomizationRoutes)
app.use('/api/ethics', ethicsRoutes)
app.use('/api/visits', visitRoutes)
app.use('/api/data', dataRoutes)
app.use('/api/performance', performanceRoutes)
app.use('/api/messages', messageRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
