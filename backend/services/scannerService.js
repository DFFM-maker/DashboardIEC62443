const { exec } = require('child_process')
const { v4: uuidv4 } = require('uuid')
const db = require('../db/database')
const analysisService = require('./analysisService')
const advisoryService = require('./advisoryService')
const { classifyDevice, assignZone } = require('./fingerprintService')

function emitLog(io, assessmentId, level, message) {
  console.log(`[${level.toUpperCase()}] ${message}`)
  if (io) io.to(assessmentId).emit('log', { level, message, timestamp: new Date() })
  db.run('INSERT INTO scan_logs (id, assessment_id, level, message) VALUES (?,?,?,?)',
    [uuidv4(), assessmentId, level, message])
}

function runCommand(cmd, timeout = 120000) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout }, (err, stdout, stderr) => {
      if (err && err.killed) reject(new Error(`Timeout: ${cmd}`))
      else resolve({ stdout: stdout || '', stderr: stderr || '', code: err?.code || 0 })
    })
  })
}

function parseNmapXml(xmlStr) {
  const hosts = []
  const hostBlocks = xmlStr.match(/<host[\s\S]*?<\/host>/g) || []
  for (const block of hostBlocks) {
    const statusMatch = block.match(/<status state="([^"]+)"/)
    if (!statusMatch || statusMatch[1] !== 'up') continue
    const addrMatch = block.match(/<address addr="([^"]+)" addrtype="ipv4"/)
    const macMatch = block.match(/<address addr="([^"]+)" addrtype="mac"/)
    const vendorMatch = block.match(/addrtype="mac" vendor="([^"]+)"/)
    const ip = addrMatch ? addrMatch[1] : null
    if (!ip) continue
    const ports = []
    const portBlocks = block.match(/<port[\s\S]*?<\/port>/g) || []
    for (const pb of portBlocks) {
      const portId = pb.match(/portid="(\d+)"/)
      const proto  = pb.match(/protocol="([^"]+)"/)
      const state  = pb.match(/<state state="([^"]+)"/)
      const service= pb.match(/<service name="([^"]+)"/)
      const version= pb.match(/version="([^"]+)"/)
      const product= pb.match(/product="([^"]+)"/)
      if (portId && state && state[1] === 'open') {
        ports.push({
          port: parseInt(portId[1]),
          protocol: proto ? proto[1] : 'tcp',
          service: service ? service[1] : '',
          version: [product?.[1], version?.[1]].filter(Boolean).join(' '),
          state: 'open'
        })
      }
    }
    const hostnameMatch = block.match(/<hostname name="([^"]+)"/)
    hosts.push({
      ip,
      mac: macMatch ? macMatch[1] : null,
      nmapVendor: vendorMatch ? vendorMatch[1] : null,
      hostname: hostnameMatch ? hostnameMatch[1] : null,
      ports
    })
  }
  return hosts
}

async function grabSnmpDescr(ip, community = 'public') {
  try {
    const { stdout } = await runCommand(
      `snmpget -v2c -c ${community} -t 3 -r 1 ${ip} 1.3.6.1.2.1.1.1.0 2>/dev/null`, 8000)
    const m = stdout.match(/STRING:\s*"?([^"\n]+)"?/)
    return m ? m[1].trim() : ''
  } catch (e) { return '' }
}

async function grabHttpBanner(ip) {
  try {
    const { stdout } = await runCommand(
      `curl -sk --max-time 4 -I http://${ip} 2>/dev/null`, 6000)
    return stdout
  } catch (e) { return '' }
}

async function runScan(assessmentId, subnet, io) {
  emitLog(io, assessmentId, 'info', `Avvio scansione subnet ${subnet}...`)
  db.run('UPDATE assessments SET status = ? WHERE id = ?', ['scanning', assessmentId])

  const assessment = db.get('SELECT snmp_community FROM assessments WHERE id = ?', [assessmentId])
  const snmpCommunity = assessment?.snmp_community || 'public'

  const assessmentZones = db.all('SELECT id, name FROM zones WHERE assessment_id = ?', [assessmentId])

  try {
    // Fase 1: Host discovery
    emitLog(io, assessmentId, 'info', 'Fase 1/5: Host discovery (ARP scan)...')
    const discoveryXml = `/tmp/discovery_${assessmentId}.xml`
    await runCommand(`sudo nmap -sn ${subnet} -oX ${discoveryXml} --max-rate 100 2>/dev/null`, 120000)
    const { stdout: disc } = await runCommand(`cat ${discoveryXml}`)
    const discoveredHosts = parseNmapXml(disc)
    emitLog(io, assessmentId, 'info', `  → ${discoveredHosts.length} host attivi trovati`)

    if (discoveredHosts.length === 0) {
      emitLog(io, assessmentId, 'warning', 'Nessun host trovato. Verifica subnet e connettività.')
      db.run('UPDATE assessments SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['completed', assessmentId])
      return
    }

    // Fase 2: Port scan
    emitLog(io, assessmentId, 'info', 'Fase 2/5: Port scan porte OT critiche...')
    const ipList = discoveredHosts.map(h => h.ip).join(',')
    const portscanXml = `/tmp/portscan_${assessmentId}.xml`
    await runCommand(
      `sudo nmap -sS -p 21,22,23,25,80,102,135,139,443,445,502,515,902,912,4840,8080,9600,20000,44818,50000 ` +
      `--max-rate 100 -T3 --open --host-timeout 15s ${ipList} -oX ${portscanXml} 2>/dev/null`, 240000)
    const { stdout: ps } = await runCommand(`cat ${portscanXml}`)
    const scannedHosts = parseNmapXml(ps)

    // Fase 3: Version detection
    emitLog(io, assessmentId, 'info', 'Fase 3/5: Service version detection...')
    const versionsXml = `/tmp/versions_${assessmentId}.xml`
    await runCommand(
      `sudo nmap -sV --version-intensity 5 -p 80,443,22,23,4840,9600,44818,50000,8080 ` +
      `--max-rate 50 -T3 --host-timeout 15s ${ipList} -oX ${versionsXml} 2>/dev/null`, 300000)
    const { stdout: vs } = await runCommand(`cat ${versionsXml}`)
    const versionedHosts = parseNmapXml(vs)

    // Merge results
    const hostMap = {}
    for (const h of scannedHosts) hostMap[h.ip] = { ...h }
    for (const h of versionedHosts) {
      if (hostMap[h.ip]) {
        for (const vp of h.ports) {
          const existing = hostMap[h.ip].ports.find(p => p.port === vp.port)
          if (existing && vp.version) existing.version = vp.version
        }
      }
    }
    for (const dh of discoveredHosts) {
      if (!hostMap[dh.ip]) hostMap[dh.ip] = { ...dh }
      else {
        if (!hostMap[dh.ip].mac && dh.mac) hostMap[dh.ip].mac = dh.mac
        if (!hostMap[dh.ip].nmapVendor && dh.nmapVendor) hostMap[dh.ip].nmapVendor = dh.nmapVendor
      }
    }

    // Fase 4: SNMP + HTTP fingerprinting
    emitLog(io, assessmentId, 'info', 'Fase 4/5: SNMP banner + HTTP fingerprinting...')
    for (const [ip, host] of Object.entries(hostMap)) {
      const ports = host.ports || []
      const hasHttp = ports.some(p => [80, 443, 8080].includes(p.port))

      // SNMP su tutti gli host (non solo quelli con porte OT già trovate —
      // il port scan potrebbe aver mancato le porte per timeout)
      host.snmpDescr = await grabSnmpDescr(ip, snmpCommunity)
      if (host.snmpDescr)
        emitLog(io, assessmentId, 'info', `  → ${ip} SNMP: ${host.snmpDescr.slice(0, 60)}`)

      if (hasHttp) host.httpBanner = await grabHttpBanner(ip)
    }

    // Fase 5: Classificazione e salvataggio
    emitLog(io, assessmentId, 'info', 'Fase 5/5: Classificazione e salvataggio asset...')
    const savedAssets = []
    const portsMap = {}

    for (const [ip, host] of Object.entries(hostMap)) {
      const fp = classifyDevice(
        host.mac || null, host.ports || [],
        host.snmpDescr || '', host.httpBanner || ''
      )
      const vendor = fp.vendor || host.nmapVendor || null
      const zone   = assignZone(fp.device_type, vendor, assessmentZones)

      const noteParts = []
      if (host.hostname) noteParts.push(`Hostname: ${host.hostname}`)
      if (fp.classification_notes) noteParts.push(fp.classification_notes)

      const assetId = uuidv4()
      db.run(
        `INSERT INTO assets
         (id, assessment_id, ip, mac, vendor, device_type, device_model,
          firmware_version, security_zone, criticality, notes, classified_by)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [assetId, assessmentId, ip, host.mac || null, vendor,
         fp.device_type, fp.device_model, fp.firmware_version,
         zone, fp.criticality, noteParts.join(' | ') || '', 'auto']
      )

      const zoneRow = assessmentZones.find(z => z.name === zone)
      if (zoneRow) {
        try { db.run('INSERT OR IGNORE INTO zone_assets (zone_id, asset_id) VALUES (?,?)',
          [zoneRow.id, assetId]) } catch (e) {}
      }

      const portRows = []
      for (const port of (host.ports || [])) {
        const portId = uuidv4()
        db.run(
          `INSERT INTO open_ports (id, asset_id, port, protocol, service, version, state, is_required)
           VALUES (?,?,?,?,?,?,?,?)`,
          [portId, assetId, port.port, port.protocol, port.service, port.version, port.state, 0])
        portRows.push({ ...port, id: portId, asset_id: assetId })
      }

      savedAssets.push({ id: assetId, ip, mac: host.mac, vendor,
        device_type: fp.device_type, device_model: fp.device_model,
        firmware_version: fp.firmware_version, security_zone: zone, criticality: fp.criticality })
      portsMap[assetId] = portRows

      emitLog(io, assessmentId, 'info',
        `  → ${ip} | ${fp.device_type} | ${vendor || '?'} | ${fp.device_model || ''} | zona: ${zone}`)
    }

    // Analisi IEC 62443
    const findings = analysisService.analyze(savedAssets, portsMap)
    for (const finding of findings) {
      db.run(
        `INSERT INTO findings
         (id, assessment_id, asset_id, finding_code, title, description,
          cvss_score, cvss_vector, severity, iec62443_sr, iec62443_part,
          evidence, remediation, remediation_priority, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [uuidv4(), assessmentId, finding.asset_id, finding.finding_code,
         finding.title, finding.description, finding.cvss_score, finding.cvss_vector,
         finding.severity, finding.iec62443_sr, finding.iec62443_part,
         finding.evidence, finding.remediation, finding.remediation_priority, 'open'])
    }
    emitLog(io, assessmentId, 'info',
      `  → ${savedAssets.length} asset salvati, ${findings.length} finding rilevati`)

    const vendors = [...new Set(savedAssets.map(a => a.vendor).filter(Boolean))]
    if (vendors.length > 0) {
      emitLog(io, assessmentId, 'info', `Recupero advisory CISA/NVD per: ${vendors.join(', ')}...`)
      await advisoryService.fetchAndCacheAdvisories(vendors, io, assessmentId)
    }

    db.run('UPDATE assessments SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', assessmentId])
    emitLog(io, assessmentId, 'success',
      `Scansione completata: ${savedAssets.length} asset, ${findings.length} finding`)

    if (io) io.to(assessmentId).emit('scan_complete', { assets: savedAssets.length, findings: findings.length })

  } catch (err) {
    emitLog(io, assessmentId, 'error', `Errore durante la scansione: ${err.message}`)
    db.run('UPDATE assessments SET status = ? WHERE id = ?', ['error', assessmentId])
  }

  try {
    await runCommand(
      `rm -f /tmp/discovery_${assessmentId}.xml /tmp/portscan_${assessmentId}.xml /tmp/versions_${assessmentId}.xml`)
  } catch (e) {}
}

module.exports = { runScan }
