require('dotenv').config()
const express = require('express')

const http = require('http')
const cors = require('cors')
const path = require('path')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
})

// Middleware
app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Static assets (logos)
app.use('/assets', express.static(path.join(__dirname, '../assets')))

// Frontend (produzione: serve dist/ buildato con "npm run build")
const frontendDist = path.join(__dirname, '../frontend/dist')
if (require('fs').existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
}

// Routes
const assessmentsRoute = require('./routes/assessments')
const { setIo } = assessmentsRoute
setIo(io)

app.use('/api/assessments', assessmentsRoute.router)
app.use('/api/assets', require('./routes/assets'))
app.use('/api/findings', require('./routes/findings'))
app.use('/api/clients', require('./routes/clients'))
app.use('/api/advisories', require('./routes/advisories'))
app.use('/api/templates', require('./routes/templates'))
app.use('/api/export', require('./routes/export'))
app.use('/api/import', require('./routes/export'))
app.use('/api/zones', require('./routes/zones'))
app.use('/api/conduits', require('./routes/conduits'))
app.use('/api/iec-controls', require('./routes/iec_controls'))
app.use('/api/assessments/:assessmentId/risk-events', require('./routes/risk_events'))
app.use('/api/zone-controls', require('./routes/zone_controls'))
app.use('/api/assessments/:assessmentId/report', require('./routes/report'))
app.use('/api/assessments/:assessmentId/wizard-report', require('./routes/wizard_report').router)
app.use('/api/assessments/:assessmentId', require('./routes/policies'))

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: '2.0.0', timestamp: new Date() })
})

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connesso:', socket.id)

  socket.on('join', (assessmentId) => {
    socket.join(assessmentId)
    console.log(`Socket ${socket.id} joined room: ${assessmentId}`)
  })

  socket.on('disconnect', () => {
    console.log('Client disconnesso:', socket.id)
  })
})

// SPA fallback: tutte le route non-API servono index.html (solo in produzione)
if (require('fs').existsSync(frontendDist)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

const PORT = process.env.PORT || 3001
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Tecnopack OT Security Dashboard v2.0`)
  console.log(`Backend API → http://0.0.0.0:${PORT}`)
  console.log(`Pronto.`)
})

module.exports = { app, io }
