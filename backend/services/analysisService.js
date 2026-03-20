// analysisService.js — IEC 62443 finding rules engine

const RULES = [
  // F-001: Telnet abilitato
  {
    code: 'F-TELNET-OPEN',
    check: (asset, ports) => ports.some(p => p.port === 23 && p.state === 'open'),
    title: 'Telnet abilitato — protocollo di gestione in chiaro',
    description: 'Il protocollo Telnet trasmette credenziali e comandi in chiaro. In ambiente OT rappresenta un rischio critico poiché consente intercettazione di credenziali di accesso ai dispositivi di rete e controllo dell\'impianto.',
    cvss_score: 9.1,
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    severity: 'critical',
    iec62443_sr: ['SR 3.1', 'SR 4.1', 'SR 7.7'],
    remediation: '1. Disabilitare Telnet: `no telnet-server` (HPE: `telnet disable`)\n2. Usare esclusivamente SSH con autenticazione a chiave pubblica\n3. Aggiornare firmware all\'ultima versione disponibile\n4. Implementare ACL per limitare l\'accesso di gestione',
    remediation_priority: 'Immediate'
  },

  // F-002: B&R TCP/50000 senza auth con dati produzione
  {
    code: 'F-BR-NOAUTH-PRODUCTION',
    check: (asset, ports) =>
      ports.some(p => p.port === 50000 && p.state === 'open') &&
      asset.vendor && asset.vendor.toLowerCase().includes('b&r'),
    title: 'Accesso non autenticato TCP/50000 — dati produzione esposti',
    description: 'Il socket TCP 50000 accetta connessioni senza autenticazione e restituisce immediatamente dati di produzione in chiaro (pesi, ordini, username supervisor). Chiunque sulla rete può leggere e potenzialmente alterare i dati di produzione.',
    cvss_score: 9.8,
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    severity: 'critical',
    iec62443_sr: ['SR 2.1', 'SR 4.1', 'SR 4.2', 'SR 1.2'],
    remediation: '1. ACL switch: TCP/50000 solo da IP autorizzati\n2. Contattare Idecon/B&R per meccanismi di autenticazione\n3. Non esporre il socket su segmenti di rete non fidati\n4. Monitorare connessioni in ingresso su TCP/50000',
    remediation_priority: 'Immediate'
  },

  // F-003: FINS Omron esposto senza autenticazione
  {
    code: 'F-FINS-NOAUTH',
    check: (asset, ports) =>
      ports.some(p => p.port === 9600 && p.state === 'open') &&
      asset.vendor && asset.vendor.toLowerCase().includes('omron'),
    title: 'Protocollo FINS Omron esposto senza autenticazione',
    description: 'Il protocollo FINS (Factory Interface Network Service) di Omron è accessibile sulla porta 9600/tcp senza autenticazione. Permette lettura/scrittura della memoria PLC, modifica setpoint, avvio/arresto programmi e potenzialmente un\'interruzione del processo produttivo.',
    cvss_score: 8.6,
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:L',
    severity: 'high',
    iec62443_sr: ['SR 2.1', 'SR 1.1', 'SR 3.6'],
    remediation: '1. IP Filter su NJ501-1300 (Network Configurator > Security Settings)\n2. Bloccare 9600/tcp via ACL switch per tutti gli IP non autorizzati\n3. Abilitare FINS node address filtering\n4. Considerare upgrade a comunicazione OPC-UA con certificati',
    remediation_priority: 'Immediate'
  },

  // F-004: EtherNet/IP information disclosure
  {
    code: 'F-ENIP-DISCLOSURE',
    check: (asset, ports) =>
      ports.some(p => p.port === 44818 && p.state === 'open') &&
      asset.vendor && asset.vendor.toLowerCase().includes('omron'),
    title: 'EtherNet/IP esposto — device information disclosure',
    description: 'Il servizio EtherNet/IP su porta 44818 risponde a richieste List Identity non autenticate, restituendo modello, vendor, serial number e versione firmware del PLC. Queste informazioni facilitano la ricerca di vulnerabilità specifiche del dispositivo.',
    cvss_score: 7.5,
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
    severity: 'high',
    iec62443_sr: ['SR 2.1', 'SR 4.1'],
    remediation: '1. IP filtering: 44818/tcp solo da HMI e sistemi SCADA autorizzati\n2. Abilitare CIP Security (autenticazione e cifratura EtherNet/IP)\n3. Disabilitare List Identity su device non esposti verso reti non trusted\n4. Network segmentation con firewall L3',
    remediation_priority: 'Short-term'
  },

  // F-005: HTTP non cifrato su HMI
  {
    code: 'F-HMI-HTTP-CLEAR',
    check: (asset, ports) =>
      asset.device_type === 'HMI' &&
      ports.some(p => p.port === 80 && p.state === 'open') &&
      !ports.some(p => p.port === 443 && p.state === 'open'),
    title: 'Interfaccia web HMI accessibile via HTTP non cifrato',
    description: 'L\'interfaccia web degli HMI Hakko GR-series è accessibile tramite HTTP non cifrato. Le credenziali di accesso e i dati di supervisione vengono trasmessi in chiaro, rendendo possibile l\'intercettazione via ARP spoofing o attacchi man-in-the-middle.',
    cvss_score: 6.5,
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
    severity: 'high',
    iec62443_sr: ['SR 4.1', 'SR 3.1'],
    remediation: '1. Abilitare HTTPS nel firmware Hakko (se supportato)\n2. Implementare reverse proxy TLS (nginx) davanti agli HMI\n3. Bloccare porta 80/tcp via ACL, esporre solo 443/tcp\n4. Segmentare HMI Zone con VLAN dedicata',
    remediation_priority: 'Short-term'
  },

  // F-006: SMB in rete OT
  {
    code: 'F-SMB-IN-OT',
    check: (asset, ports) => ports.some(p => p.port === 445 && p.state === 'open'),
    title: 'SMB (porta 445) aperto in rete OT — rischio ransomware/lateral movement',
    description: 'La presenza di SMB in una rete OT è un vettore primario per ransomware (WannaCry, NotPetya) e lateral movement. Un host Windows con SMB esposto nella rete OT può compromettere l\'intera infrastruttura industriale se raggiunto da malware o attaccante.',
    cvss_score: 7.8,
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    severity: 'high',
    iec62443_sr: ['SR 5.1', 'SR 7.7', 'SR 1.1', 'SR 2.1'],
    remediation: '1. Identificare e inventariare il device Windows nella rete OT\n2. Bloccare porta 445/tcp e 139/tcp via ACL switch\n3. Isolare in VLAN separata con accesso controllato\n4. Disabilitare SMBv1, mantenere patch Windows aggiornate\n5. Valutare rimozione o sostituzione del device dalla rete OT',
    remediation_priority: 'Immediate'
  },

  // F-007: Asset non documentati
  {
    code: 'F-UNDOCUMENTED-ASSET',
    check: (asset, ports) =>
      asset.notes && asset.notes.includes('NON DOCUMENTATO'),
    title: 'Asset non documentato nell\'inventario di sicurezza OT',
    description: 'Il device è stato rilevato dalla scansione nmap ma non era presente nell\'inventario OT ufficiale. Asset non documentati rappresentano un rischio di sicurezza perché non sono soggetti a patch management, monitoraggio o controlli di sicurezza.',
    cvss_score: 5.3,
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N',
    severity: 'medium',
    iec62443_sr: ['SR 1.1', 'SR 2.4'],
    remediation: '1. Identificare proprietario e scopo del device\n2. Aggiornare inventario OT con tutti i dettagli\n3. Verificare l\'autorizzazione alla presenza in rete OT\n4. Applicare policy di patch management\n5. Includere nel monitoraggio continuo',
    remediation_priority: 'Short-term'
  },

  // F-008: OPC-UA esposto senza verifica security mode
  {
    code: 'F-OPCUA-SECURITY',
    check: (asset, ports) =>
      ports.some(p => p.port === 4840 && p.state === 'open'),
    title: 'OPC-UA esposto — security mode da verificare',
    description: 'Il servizio OPC-UA è accessibile sulla porta 4840/tcp. La security policy potrebbe essere configurata in modalità None (nessuna autenticazione/cifratura), rendendo possibile lettura e scrittura non autorizzata dei tag di processo.',
    cvss_score: 6.5,
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
    severity: 'medium',
    iec62443_sr: ['SR 2.1', 'SR 4.1'],
    remediation: '1. Verificare con UA Expert la security policy configurata\n2. Configurare Security Mode: Sign&Encrypt\n3. Selezionare Security Policy: Basic256Sha256\n4. Abilitare autenticazione con certificati X.509\n5. Limitare accesso 4840/tcp ai soli client autorizzati',
    remediation_priority: 'Short-term'
  },

  // F-009: HTTP 8080 su Secomea
  {
    code: 'F-SECOMEA-8080',
    check: (asset, ports) =>
      asset.vendor && asset.vendor.toLowerCase().includes('secomea') &&
      ports.some(p => p.port === 8080 && p.state === 'open'),
    title: 'Porta HTTP 8080 aperta su router accesso remoto Secomea',
    description: 'La porta 8080/tcp è aperta sul SiteManager Secomea. Potrebbe esporre un\'interfaccia di gestione non cifrata o un servizio non documentato che aumenta la superficie di attacco del gateway di accesso remoto.',
    cvss_score: 5.0,
    cvss_vector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:L',
    severity: 'medium',
    iec62443_sr: ['SR 1.1', 'SR 2.1'],
    remediation: '1. Identificare il servizio in ascolto su 8080/tcp\n2. Se non necessario, disabilitare il servizio\n3. Se necessario, proteggere con autenticazione forte\n4. Limitare l\'accesso via firewall solo agli IP necessari',
    remediation_priority: 'Short-term'
  },

  // F-010: Servizi inattesi su HMI (SSH Dropbear + LPD)
  {
    code: 'F-HMI-UNEXPECTED-SERVICES',
    check: (asset, ports) =>
      asset.device_type === 'HMI' &&
      ports.some(p => p.port === 22 && p.state === 'open') &&
      ports.some(p => p.port === 515 && p.state === 'open'),
    title: 'Servizi inattesi su HMI: SSH Dropbear + LPD printer',
    description: 'L\'HMI presenta servizi non standard: SSH Dropbear (porta 22) e LPD printer (porta 515). SSH su un HMI tipico è anomalo e potrebbe indicare accesso backdoor o compromissione. LPD è un protocollo legacy vulnerabile a exploit. L\'OS Linux confermato da nmap aumenta la superficie di attacco.',
    cvss_score: 4.3,
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N',
    severity: 'medium',
    iec62443_sr: ['SR 1.1', 'SR 2.4'],
    remediation: '1. Verificare l\'origine e la necessità del servizio SSH\n2. Se non necessario, disabilitare SSH sul device\n3. Disabilitare il servizio LPD (lpd/515) se non utilizzato\n4. Verificare integrità del firmware con il vendor Hakko\n5. Monitorare connessioni SSH in ingresso',
    remediation_priority: 'Short-term'
  },

  // F-011: Firmware obsoleto
  {
    code: 'F-FIRMWARE-OBSOLETE',
    check: (asset, ports) =>
      asset.firmware_version && (
        asset.firmware_version.includes('2017') ||
        asset.firmware_version.toLowerCase().includes('ya.16.04')
      ),
    title: 'Firmware obsoleto — versione del 2017',
    description: 'Il dispositivo esegue un firmware risalente al 2017, che non ha ricevuto patch di sicurezza per oltre 7 anni. Versioni firmware così datate contengono vulnerabilità note con CVE pubblici e non sono più supportate dal vendor.',
    cvss_score: 7.2,
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    severity: 'high',
    iec62443_sr: ['SR 7.6', 'SR 3.2'],
    remediation: '1. Pianificare aggiornamento firmware all\'ultima versione HPE disponibile\n2. Verificare compatibilità firmware con configurazione esistente\n3. Eseguire backup configurazione prima dell\'aggiornamento\n4. Implementare processo di patch management periodico',
    remediation_priority: 'Short-term'
  },

  // F-012: VMware in rete OT
  {
    code: 'F-VMWARE-IN-OT',
    check: (asset, ports) =>
      ports.some(p => (p.port === 902 || p.port === 912) && p.state === 'open'),
    title: 'Servizi VMware rilevati in rete OT',
    description: 'Porte VMware (902/tcp SOAP API, 912/tcp AuthD) rilevate in rete OT industriale. Un hypervisor VMware in una rete OT introduce complessità di sicurezza elevata: superficie di attacco estesa, rischio di VM escape e possibilità di compromissione di multiple VM da un singolo punto.',
    cvss_score: 6.8,
    cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    severity: 'high',
    iec62443_sr: ['SR 1.1', 'SR 7.7'],
    remediation: '1. Identificare il ruolo del sistema VMware nella rete OT\n2. Bloccare 902/tcp e 912/tcp via ACL\n3. Valutare migrazione del workload fuori dalla rete OT\n4. Se necessario: hardening VMware con autenticazione forte e patch aggiornate',
    remediation_priority: 'Immediate'
  }
]

function analyze(assets, portsMap) {
  const findings = []

  for (const asset of assets) {
    const ports = portsMap[asset.id] || []
    for (const rule of RULES) {
      try {
        if (rule.check(asset, ports)) {
          findings.push({
            asset_id: asset.id,
            asset_ip: asset.ip,
            finding_code: rule.code,
            title: rule.title,
            description: rule.description,
            cvss_score: rule.cvss_score,
            cvss_vector: rule.cvss_vector,
            severity: rule.severity,
            iec62443_sr: JSON.stringify(rule.iec62443_sr),
            iec62443_part: '3-3',
            evidence: buildEvidence(asset, ports, rule.code),
            remediation: rule.remediation,
            remediation_priority: rule.remediation_priority,
            status: 'open'
          })
        }
      } catch (e) {
        // skip rule error
      }
    }
  }

  return findings
}

function buildEvidence(asset, ports, code) {
  const portList = ports.map(p => `${p.port}/${p.protocol} ${p.service || ''} ${p.version || ''}`).join(', ')
  return `IP: ${asset.ip} | Vendor: ${asset.vendor || 'N/A'} | Modello: ${asset.device_model || 'N/A'}\nPorte aperte: ${portList}\nNote: ${asset.notes || ''}`
}

module.exports = { analyze, RULES }
