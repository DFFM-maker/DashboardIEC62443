const https = require('https')
const db = require('../db/database')

const VENDOR_CONFIG = {
  'Omron': {
    keywords: ['Omron', 'OMRON'],
    cisaUrl: 'https://www.cisa.gov/ics-advisories',
    advisoryUrl: 'https://www.cisa.gov/news-events/ics-advisories',
    jpcertUrl: 'https://jvn.jp/en/cve/',
    nvdQuery: 'Omron+PLC'
  },
  'B&R': {
    keywords: ['B&R', 'Bernecker', 'Rainer', 'B-R Industrial'],
    advisoryUrl: 'https://www.br-automation.com/en/support/updates-and-upgrades/security-advisories/',
    nvdQuery: 'B%26R+Industrial+Automation'
  },
  'Hakko': {
    keywords: ['Hakko', 'Monitouch'],
    nvdQuery: 'Hakko+HMI'
  },
  'Secomea': {
    keywords: ['Secomea', 'SiteManager'],
    advisoryUrl: 'https://www.secomea.com/support/cybersecurity-advisories/',
    nvdQuery: 'Secomea'
  },
  'Siemens': {
    keywords: ['Siemens', 'SIMATIC', 'SINEC', 'S7'],
    advisoryUrl: 'https://cert-portal.siemens.com/productcert/advisories/',
    nvdQuery: 'Siemens+SIMATIC'
  },
  'Schneider Electric': {
    keywords: ['Schneider', 'Modicon', 'EcoStruxure'],
    advisoryUrl: 'https://www.se.com/ww/en/work/support/cybersecurity/security-notifications.jsp',
    nvdQuery: 'Schneider+Electric+PLC'
  },
  'Rockwell': {
    keywords: ['Rockwell', 'Allen-Bradley', 'ControlLogix', 'Studio 5000'],
    advisoryUrl: 'https://www.rockwellautomation.com/en-us/trust-center/security-advisories.html',
    nvdQuery: 'Rockwell+Automation+Allen-Bradley'
  },
  'HPE': {
    keywords: ['Hewlett Packard', 'HPE', 'Aruba'],
    advisoryUrl: 'https://support.hpe.com/hpesc/public/home/productFamily/8001082',
    nvdQuery: 'HPE+Aruba+switch'
  }
}

async function fetchNvdAdvisories(vendor) {
  const config = VENDOR_CONFIG[vendor]
  if (!config) return []

  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?` +
    `keywordSearch=${config.nvdQuery}&` +
    `keywordExactMatch=false&` +
    `noRejected&` +
    `resultsPerPage=10`

  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Tecnopack-OT-Dashboard/2.0' }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          const advisories = (json.vulnerabilities || [])
            .filter(v => {
              const score = v.cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ||
                            v.cve.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore || 0
              return score >= 7.0
            })
            .map(v => ({
              id: v.cve.id,
              source: 'NVD-CISA',
              vendor: vendor,
              title: v.cve.descriptions?.find(d => d.lang === 'en')?.value?.slice(0, 200) || v.cve.id,
              description: v.cve.descriptions?.find(d => d.lang === 'en')?.value || '',
              cvss_score: v.cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ||
                          v.cve.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore || null,
              cve_ids: JSON.stringify([v.cve.id]),
              affected_products: JSON.stringify(
                v.cve.configurations?.flatMap(c =>
                  c.nodes?.flatMap(n => n.cpeMatch?.map(m => m.criteria) || []) || []
                ).slice(0, 5) || []
              ),
              url: `https://nvd.nist.gov/vuln/detail/${v.cve.id}`,
              published_at: v.cve.published
            }))
          resolve(advisories)
        } catch (e) {
          resolve([])
        }
      })
    })
    req.on('error', () => resolve([]))
    req.setTimeout(10000, () => { req.destroy(); resolve([]) })
  })
}

async function fetchCisaIcsAdvisories() {
  const url = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Tecnopack-OT-Dashboard/2.0' }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          const otKeywords = Object.values(VENDOR_CONFIG)
            .flatMap(v => v.keywords)
            .map(k => k.toLowerCase())

          const filtered = (json.vulnerabilities || [])
            .filter(v => {
              const text = (v.vendorProject + ' ' + v.product + ' ' + v.shortDescription).toLowerCase()
              return otKeywords.some(k => text.includes(k.toLowerCase()))
            })
            .slice(0, 50)
            .map(v => {
              const vendor = Object.entries(VENDOR_CONFIG).find(([k, cfg]) =>
                cfg.keywords.some(kw =>
                  (v.vendorProject + ' ' + v.product).toLowerCase().includes(kw.toLowerCase())
                )
              )?.[0] || 'Unknown'

              return {
                id: v.cveID,
                source: 'CISA-KEV',
                vendor,
                title: `${v.vendorProject} ${v.product} — ${v.vulnerabilityName}`,
                description: v.shortDescription,
                cvss_score: null,
                cve_ids: JSON.stringify([v.cveID]),
                affected_products: JSON.stringify([`${v.vendorProject} ${v.product}`]),
                url: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
                published_at: v.dateAdded
              }
            })
          resolve(filtered)
        } catch (e) {
          resolve([])
        }
      })
    })
    req.on('error', () => resolve([]))
    req.setTimeout(15000, () => { req.destroy(); resolve([]) })
  })
}

async function fetchAndCacheAdvisories(vendorsFound, io, assessmentId) {
  const emitLog = (msg) => {
    if (io) io.to(assessmentId).emit('log', { level: 'info', message: msg, timestamp: new Date() })
  }

  emitLog('Recupero advisory CISA ICS-CERT e NVD...')

  const cisaAdvisories = await fetchCisaIcsAdvisories()
  emitLog(`  → CISA KEV: ${cisaAdvisories.length} advisory OT trovati`)

  const nvdAdvisories = []
  for (const vendor of vendorsFound) {
    const normalized = Object.keys(VENDOR_CONFIG).find(k =>
      vendor.toLowerCase().includes(k.toLowerCase())
    )
    if (normalized) {
      emitLog(`  → NVD: recupero per ${normalized}...`)
      const results = await fetchNvdAdvisories(normalized)
      nvdAdvisories.push(...results)
      emitLog(`     trovati ${results.length} CVE HIGH/CRITICAL`)
      await new Promise(r => setTimeout(r, 7000))
    }
  }

  const allAdvisories = [...cisaAdvisories, ...nvdAdvisories]

  const upsert = db.prepare(
    `INSERT OR REPLACE INTO advisories
     (id, source, vendor, title, description, cvss_score,
      cve_ids, affected_products, url, published_at, fetched_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`
  )

  for (const adv of allAdvisories) {
    try {
      upsert.run(
        adv.id, adv.source, adv.vendor, adv.title,
        adv.description, adv.cvss_score, adv.cve_ids,
        adv.affected_products, adv.url, adv.published_at
      )
    } catch (e) { /* skip duplicati */ }
  }

  emitLog(`Advisory aggiornati: ${allAdvisories.length} totali in cache`)
  return allAdvisories
}

function getAdvisoriesForAsset(vendor) {
  const normalized = Object.keys(VENDOR_CONFIG).find(k =>
    vendor?.toLowerCase().includes(k.toLowerCase())
  )
  if (!normalized) return []

  const keywords = VENDOR_CONFIG[normalized]?.keywords || []
  if (keywords.length === 0) return []
  const placeholders = keywords.map(() => 'title LIKE ? OR description LIKE ?').join(' OR ')
  const params = keywords.flatMap(k => [`%${k}%`, `%${k}%`])

  return db.all(
    `SELECT * FROM advisories WHERE vendor = ? OR (${placeholders}) ORDER BY cvss_score DESC LIMIT 10`,
    [normalized, ...params]
  )
}

function getVendorAdvisoryUrls(vendor) {
  const normalized = Object.keys(VENDOR_CONFIG).find(k =>
    vendor?.toLowerCase().includes(k.toLowerCase())
  )
  if (!normalized) return []
  const cfg = VENDOR_CONFIG[normalized]
  return [cfg.advisoryUrl, cfg.jpcertUrl, cfg.cisaUrl].filter(Boolean)
}

module.exports = {
  fetchAndCacheAdvisories,
  getAdvisoriesForAsset,
  getVendorAdvisoryUrls,
  VENDOR_CONFIG
}
