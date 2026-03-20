# OT Assessment Report — Dati per Dashboard Seed
## Assessment: OT_Assessment_Impianto_X | Data: 2026-03-19 | Subnet: 172.16.224.0/20

Questo file contiene tutti i dati reali raccolti durante la sessione di assessment.
Usali per pre-popolare il database del dashboard (`backend/seed.js`) in Fase 4 del dashboard.md.

---

## AMBIENTE KALI

- **Kali VM IP**: 172.16.224.250 (eth0)
- **nmap**: 7.95 — disponibile
- **sudo**: configurato NOPASSWD per kali (già in /etc/sudoers)
- **Node.js**: da installare (seguire dashboard.md Fase 0)
- **Report già generati**: `~/assessment/reports/` (HTML, XLSX, PDF, CSV, JSON)
- **Raw nmap XML**: `~/assessment/raw/` (discovery.xml, portscan.xml, versions.xml, enip.xml, fins.xml)

---

## ASSET INVENTORY COMPLETO (17 device trovati)

### Zone 1 — PLC Zone (SL-2)

| IP | MAC | Vendor | Modello | Porte | Serial | Note |
|----|-----|--------|---------|-------|--------|------|
| 172.16.224.21 | 3C:F7:D1:80:3A:8F | Omron Corporation | NJ501-1300 Rev 2.9 | 443,4840,9600,44818 | 0x01c5f556 | Status 0x0030 Running |
| 172.16.224.22 | 3C:F7:D1:80:4E:BB | Omron Corporation | NJ501-1300 Rev 2.9 | 443,4840,9600,44818 | 0x01c5fbd8 | **Status 0x0034 Minor Fault** |
| 172.16.224.23 | 3C:F7:D1:80:3A:85 | Omron Corporation | NJ501-1300 Rev 2.9 | 443,4840,9600,44818 | 0x01c5f551 | Status 0x0030 Running |
| 172.16.224.24 | 3C:F7:D1:80:4E:C9 | Omron Corporation | NJ501-1300 Rev 2.9 | 443,4840,9600,44818 | 0x01c5fbe5 | Status 0x0030 Running |
| 172.16.224.111 | 3C:F7:D1:80:3B:DB | Omron Corporation | NJ501-1300 Rev 2.9 | 443,4840,9600,44818 | 0x01c5f5b8 | **NON DOCUMENTATO** - Status 0x0034 Minor Fault |
| 172.16.224.201 | 00:60:65:AF:ED:F4 | B&R Industrial Automation | Idecon Codeline Scale | 50000 | ID 02795 | Banner: `226g\|codeline\|supervisor` |
| 172.16.224.202 | 00:60:65:AF:EE:0A | B&R Industrial Automation | Idecon Codeline Scale | 50000 | ID 02792 | Banner: `ORDINE_PLC_TEST\|226g\|supervisor` |
| 172.16.224.203 | 00:60:65:AF:EE:10 | B&R Industrial Automation | Idecon Codeline Scale | 50000 | ID 02794 | Banner: `900 g\|codeline\|supervisor` |
| 172.16.224.204 | 00:60:65:AF:E7:56 | B&R Industrial Automation | Idecon Codeline Scale | 50000 | ID 02793 | Banner: `ORD1000\|400 g\|supervisor` |

### Zone 2 — HMI Zone (SL-1)

| IP | MAC | Vendor | Modello | Porte | Note |
|----|-----|--------|---------|-------|------|
| 172.16.224.41 | 00:50:FF:14:C5:37 | Hakko Electronics | GR-series HMI | 80 | Server: GR-HTTPD/2.20 |
| 172.16.224.42 | 00:50:FF:14:CF:D6 | Hakko Electronics | GR-series HMI | 80 | Server: GR-HTTPD/2.20 |
| 172.16.224.43 | 00:50:FF:15:37:85 | Hakko Electronics | GR-series HMI | 80 | Server: GR-HTTPD/2.20 |
| 172.16.224.44 | 00:50:FF:15:37:6D | Hakko Electronics | GR-series HMI | 80 | Server: GR-HTTPD/2.20 |
| 172.16.224.121 | 00:50:FF:15:CA:46 | Hakko Electronics | GR-series (variante) | 22,515 | **NON DOCUMENTATO** - SSH Dropbear 2022.83 + LPD printer - **OS: Linux** (confermato da nmap) |

### Zone 3 — Remote Access / Infrastructure (SL-2)

| IP | MAC | Vendor | Modello | Porte | Note |
|----|-----|--------|---------|-------|------|
| 172.16.239.2 | EC:EB:B8:B5:09:50 | Hewlett Packard Enterprise | **HP J9777A 2530-8G Switch** | 22,23,80 | **CRITICO: Telnet abilitato!** SSH: Mocana NanoSSH 6.3, HTTP: eHTTP v2.0, **Firmware: YA.16.04.0008 (2017 — obsoleto)** |
| 172.16.239.254 | 00:C0:A2:09:60:C4 | Intermedium A/S (Secomea) | SiteManager | 443,8080 | HTTPS auth required (Apache), porta 8080 da verificare |

### Zone 4 — Unclassified

| IP | MAC | Vendor | Modello | Porte | Note |
|----|-----|--------|---------|-------|------|
| 172.16.224.10 | 14:4F:D7:CD:E5:44 | D&S Cable Industries (HK) | Windows/VMware host | 135,139,445,902,912,161/udp | **NON DOCUMENTATO** - SMB + VMware in rete OT |

---

## FINDINGS (10 finding — 2 Critical, 4 High, 4 Medium)

### F-001 — CRITICAL (CVSS 9.1)
- **Titolo**: Telnet abilitato su switch OT — protocollo di gestione in chiaro
- **IP**: 172.16.239.2 (**HP J9777A 2530-8G Switch, firmware YA.16.04.0008 del 2017**)
- **CVSS Vector**: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N
- **IEC 62443 SR**: SR 3.1, SR 4.1, SR 7.7
- **Priorità**: Immediate
- **Evidence**:
  ```
  nmap -sV 172.16.239.2: 23/tcp open telnet
  Banner Telnet (estratto da nmap fingerprint):
  "HP J9777A 2530-8G Switch
   Software revision YA.16.04.0008
   (C) Copyright 2017 Hewlett Packard Enterprise
   Username: "
  ```
- **Remediation**: `no telnet-server` sulla CLI switch (`telnet disable`), aggiornare firmware HPE 2530 all'ultima versione disponibile

### F-002 — CRITICAL (CVSS 9.8)
- **Titolo**: Accesso non autenticato TCP/50000 con esposizione dati produzione in chiaro
- **IP**: 172.16.224.201, 202, 203, 204 (B&R Idecon Bilance)
- **CVSS Vector**: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
- **IEC 62443 SR**: SR 2.1, SR 4.1, SR 4.2, SR 1.2
- **Priorità**: Immediate
- **Evidence**:
  ```
  nc 172.16.224.201 50000: EVENT=19/03/2026 14:34:18|||226g|codeline|ID 02795|Cod. 1012|Remote connection : Local|supervisor|
  nc 172.16.224.202 50000: EVENT=19/03/2026 14:37:07|ORDINE_PLC_TEST||226g|ID 02792|supervisor|
  nc 172.16.224.203 50000: EVENT=19/03/2026 14:35:20|||900 g|ID 02794|supervisor|
  nc 172.16.224.204 50000: EVENT=19/03/2026 14:33:54|ORD1000||400 g|ID 02793|supervisor|
  ```
- **Remediation**: ACL switch per bloccare TCP/50000, contattare Idecon/B&R per auth

### F-003 — HIGH (CVSS 8.6)
- **Titolo**: Protocollo FINS Omron esposto senza autenticazione (porta 9600/tcp)
- **IP**: 172.16.224.21, 22, 23, 24, 111
- **CVSS Vector**: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:L
- **IEC 62443 SR**: SR 2.1, SR 1.1, SR 3.6
- **Priorità**: Immediate
- **Evidence**: `nmap --script omron-info: tutti 5 PLC rispondono FINS. .22 e .111: status 0x0034`
- **Remediation**: IP Filter su NJ501-1300 (Network Configurator > Security Settings)

### F-004 — HIGH (CVSS 7.5)
- **Titolo**: EtherNet/IP esposto con device information disclosure (porta 44818)
- **IP**: 172.16.224.21, 22, 23, 24, 111
- **CVSS Vector**: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N
- **IEC 62443 SR**: SR 2.1, SR 4.1
- **Priorità**: Short-term
- **Evidence**: `enip-info: NJ501-1300, Omron (47), rev 2.9, SN 0x01c5f556 — senza auth`
- **Remediation**: IP filtering, CIP Security, disabilitare ENIP List Identity

### F-005 — HIGH (CVSS 6.5)
- **Titolo**: Interfaccia web HMI accessibile via HTTP non cifrato
- **IP**: 172.16.224.41, 42, 43, 44
- **CVSS Vector**: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N
- **IEC 62443 SR**: SR 4.1, SR 3.1
- **Priorità**: Short-term
- **Evidence**: `curl http://172.16.224.41/: HTTP/1.0 404, Server: GR-HTTPD Server/2.20`
- **Remediation**: Abilitare HTTPS nel firmware Hakko o reverse proxy TLS

### F-006 — HIGH (CVSS 7.8)
- **Titolo**: Host Windows con SMB e servizi VMware nel segmento OT industriale
- **IP**: 172.16.224.10
- **CVSS Vector**: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N
- **IEC 62443 SR**: SR 1.1, SR 2.1, SR 7.7
- **Priorità**: Immediate
- **Evidence**: `135/tcp msrpc, 139/tcp netbios, 445/tcp smb, 902/tcp VMware, 912/tcp VMware`
- **Remediation**: Identificare e isolare, bloccare SMB/RPC via ACL switch

### F-007 — MEDIUM (CVSS 5.3)
- **Titolo**: Asset non documentati nell'inventario di sicurezza OT
- **IP**: 172.16.224.111 (Omron), 172.16.224.121 (Hakko)
- **CVSS Vector**: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N
- **IEC 62443 SR**: SR 1.1, SR 2.4
- **Priorità**: Short-term
- **Evidence**: `Trovati da nmap discovery ma non in inventario originale. .111: minor fault. .121: SSH Dropbear 2022.83 + LPD 515`

### F-008 — MEDIUM (CVSS 6.5)
- **Titolo**: OPC-UA esposto — security mode non verificato (porta 4840)
- **IP**: 172.16.224.21, 22, 23, 24, 111
- **CVSS Vector**: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N
- **IEC 62443 SR**: SR 2.1, SR 4.1
- **Priorità**: Short-term
- **Evidence**: `4840/tcp open opcua-tcp su tutti i PLC. Script opcua-info non disponibile.`
- **Remediation**: UA Expert per verifica, configurare Sign&Encrypt + Basic256Sha256

### F-009 — MEDIUM (CVSS 5.0)
- **Titolo**: Porta HTTP 8080 aperta su router accesso remoto Secomea
- **IP**: 172.16.239.254
- **CVSS Vector**: CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:L
- **IEC 62443 SR**: SR 1.1, SR 2.1
- **Priorità**: Short-term

### F-010 — MEDIUM (CVSS 4.3)
- **Titolo**: Servizi inattesi su HMI: SSH Dropbear + LPD printer (porta 515)
- **IP**: 172.16.224.121
- **CVSS Vector**: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N
- **IEC 62443 SR**: SR 1.1, SR 2.4
- **Priorità**: Short-term

---

## ZONE & CONDUIT MAP PROPOSTA

```
Zone 1 — PLC Zone (SL-2)
  Assets: .21, .22, .23, .24, .111 (Omron NJ501-1300)
          .201, .202, .203, .204 (B&R Idecon)
  Protocolli: EtherNet/IP, FINS, OPC-UA, TCP/50000

Zone 2 — HMI Zone (SL-1)
  Assets: .41, .42, .43, .44, .121 (Hakko GR-series)
  Protocolli: HTTP (no TLS), SSH (anomalo su .121)

Zone 3 — Remote Access / Infrastructure (SL-2)
  Assets: .239.2 (HPE Aruba switch), .239.254 (Secomea SiteManager)
  Protocolli: HTTPS, SSH, Telnet (NON CONFORME)

Zone 4 — Unclassified (SL-N/D)
  Assets: .10 (Windows/VMware — non identificato)
  Da classificare dopo identificazione

Conduit C1: Z2 (HMI) → Z1 (PLC) | FINS, EtherNet/IP | bidirezionale
Conduit C2: Z3 (Remote) → Z1 (PLC) | HTTPS | inbound con auth
Conduit C3: Z4 (Unclass) → Z1 (PLC) | NESSUNO — da bloccare
```

---

## DATI PER SEED DATABASE (dashboard.md Fase 4)

Usa il blocco seguente come base per `backend/seed.js`.
**AGGIORNA rispetto al seed originale di dashboard.md** aggiungendo:
1. I 3 asset non documentati: `.111` (Omron), `.121` (Hakko), `.10` (Windows/VMware)
2. Il finding F-002 (B&R TCP/50000) con evidence reale
3. Il finding F-003 (FINS) con tutti e 5 i PLC
4. Status PLC .22 e .111: `minor_fault`

```javascript
// backend/seed.js — dati reali assessment 2026-03-19
const seedAssets = [
  // === ZONE 1 - PLC ===
  { ip:'172.16.224.21', mac:'3C:F7:D1:80:3A:8F', vendor:'Omron Corporation',
    device_type:'PLC', device_model:'NJ501-1300', firmware_version:'Rev 2.9',
    security_zone:'PLC Zone', criticality:'high', notes:'S/N: 0x01c5f556 | Status: Running (0x0030)',
    ports:[
      {port:443,  protocol:'tcp', service:'https',        version:'',         state:'open', is_required:1},
      {port:4840, protocol:'tcp', service:'opcua-tcp',    version:'',         state:'open', is_required:1},
      {port:9600, protocol:'tcp', service:'fins',         version:'',         state:'open', is_required:0},
      {port:44818,protocol:'tcp', service:'EtherNet/IP',  version:'',         state:'open', is_required:0},
    ]},
  { ip:'172.16.224.22', mac:'3C:F7:D1:80:4E:BB', vendor:'Omron Corporation',
    device_type:'PLC', device_model:'NJ501-1300', firmware_version:'Rev 2.9',
    security_zone:'PLC Zone', criticality:'high', notes:'S/N: 0x01c5fbd8 | Status: Minor Fault (0x0034)',
    ports:[
      {port:443,  protocol:'tcp', service:'https',       state:'open', is_required:1},
      {port:4840, protocol:'tcp', service:'opcua-tcp',   state:'open', is_required:1},
      {port:9600, protocol:'tcp', service:'fins',        state:'open', is_required:0},
      {port:44818,protocol:'tcp', service:'EtherNet/IP', state:'open', is_required:0},
    ]},
  { ip:'172.16.224.23', mac:'3C:F7:D1:80:3A:85', vendor:'Omron Corporation',
    device_type:'PLC', device_model:'NJ501-1300', firmware_version:'Rev 2.9',
    security_zone:'PLC Zone', criticality:'high', notes:'S/N: 0x01c5f551',
    ports:[
      {port:443,  protocol:'tcp', service:'https',       state:'open', is_required:1},
      {port:4840, protocol:'tcp', service:'opcua-tcp',   state:'open', is_required:1},
      {port:9600, protocol:'tcp', service:'fins',        state:'open', is_required:0},
      {port:44818,protocol:'tcp', service:'EtherNet/IP', state:'open', is_required:0},
    ]},
  { ip:'172.16.224.24', mac:'3C:F7:D1:80:4E:C9', vendor:'Omron Corporation',
    device_type:'PLC', device_model:'NJ501-1300', firmware_version:'Rev 2.9',
    security_zone:'PLC Zone', criticality:'high', notes:'S/N: 0x01c5fbe5',
    ports:[
      {port:443,  protocol:'tcp', service:'https',       state:'open', is_required:1},
      {port:4840, protocol:'tcp', service:'opcua-tcp',   state:'open', is_required:1},
      {port:9600, protocol:'tcp', service:'fins',        state:'open', is_required:0},
      {port:44818,protocol:'tcp', service:'EtherNet/IP', state:'open', is_required:0},
    ]},
  { ip:'172.16.224.111', mac:'3C:F7:D1:80:3B:DB', vendor:'Omron Corporation',
    device_type:'PLC', device_model:'NJ501-1300', firmware_version:'Rev 2.9',
    security_zone:'PLC Zone', criticality:'high',
    notes:'*** ASSET NON DOCUMENTATO *** S/N: 0x01c5f5b8 | Status: Minor Fault (0x0034)',
    ports:[
      {port:443,  protocol:'tcp', service:'https',       state:'open', is_required:1},
      {port:4840, protocol:'tcp', service:'opcua-tcp',   state:'open', is_required:1},
      {port:9600, protocol:'tcp', service:'fins',        state:'open', is_required:0},
      {port:44818,protocol:'tcp', service:'EtherNet/IP', state:'open', is_required:0},
    ]},
  { ip:'172.16.224.201', mac:'00:60:65:AF:ED:F4', vendor:'B&R Industrial Automation',
    device_type:'PLC', device_model:'Idecon Codeline Scale Controller',
    security_zone:'PLC Zone', criticality:'high',
    notes:'ID: 02795 | Banner TCP/50000: "226g|codeline|ID 02795|supervisor" — DATI PROD IN CHIARO',
    ports:[{port:50000, protocol:'tcp', service:'Idecon-proprietary', state:'open', is_required:0}]},
  { ip:'172.16.224.202', mac:'00:60:65:AF:EE:0A', vendor:'B&R Industrial Automation',
    device_type:'PLC', device_model:'Idecon Codeline Scale Controller',
    security_zone:'PLC Zone', criticality:'high',
    notes:'ID: 02792 | Banner: "ORDINE_PLC_TEST|226g|ID 02792|supervisor"',
    ports:[{port:50000, protocol:'tcp', service:'Idecon-proprietary', state:'open', is_required:0}]},
  { ip:'172.16.224.203', mac:'00:60:65:AF:EE:10', vendor:'B&R Industrial Automation',
    device_type:'PLC', device_model:'Idecon Codeline Scale Controller',
    security_zone:'PLC Zone', criticality:'high',
    notes:'ID: 02794 | Banner: "900 g|codeline|ID 02794|supervisor"',
    ports:[{port:50000, protocol:'tcp', service:'Idecon-proprietary', state:'open', is_required:0}]},
  { ip:'172.16.224.204', mac:'00:60:65:AF:E7:56', vendor:'B&R Industrial Automation',
    device_type:'PLC', device_model:'Idecon Codeline Scale Controller',
    security_zone:'PLC Zone', criticality:'high',
    notes:'ID: 02793 | Banner: "ORD1000|400 g|ID 02793|supervisor"',
    ports:[{port:50000, protocol:'tcp', service:'Idecon-proprietary', state:'open', is_required:0}]},

  // === ZONE 2 - HMI ===
  { ip:'172.16.224.41', mac:'00:50:FF:14:C5:37', vendor:'Hakko Electronics',
    device_type:'HMI', device_model:'GR-series', firmware_version:'GR-HTTPD Server/2.20',
    security_zone:'HMI Zone', criticality:'medium', notes:'',
    ports:[{port:80, protocol:'tcp', service:'http', version:'GR-HTTPD 2.20', state:'open', is_required:0}]},
  { ip:'172.16.224.42', mac:'00:50:FF:14:CF:D6', vendor:'Hakko Electronics',
    device_type:'HMI', device_model:'GR-series', firmware_version:'GR-HTTPD Server/2.20',
    security_zone:'HMI Zone', criticality:'medium', notes:'',
    ports:[{port:80, protocol:'tcp', service:'http', version:'GR-HTTPD 2.20', state:'open', is_required:0}]},
  { ip:'172.16.224.43', mac:'00:50:FF:15:37:85', vendor:'Hakko Electronics',
    device_type:'HMI', device_model:'GR-series', firmware_version:'GR-HTTPD Server/2.20',
    security_zone:'HMI Zone', criticality:'medium', notes:'',
    ports:[{port:80, protocol:'tcp', service:'http', version:'GR-HTTPD 2.20', state:'open', is_required:0}]},
  { ip:'172.16.224.44', mac:'00:50:FF:15:37:6D', vendor:'Hakko Electronics',
    device_type:'HMI', device_model:'GR-series', firmware_version:'GR-HTTPD Server/2.20',
    security_zone:'HMI Zone', criticality:'medium', notes:'',
    ports:[{port:80, protocol:'tcp', service:'http', version:'GR-HTTPD 2.20', state:'open', is_required:0}]},
  { ip:'172.16.224.121', mac:'00:50:FF:15:CA:46', vendor:'Hakko Electronics',
    device_type:'HMI', device_model:'GR-series (variante)', firmware_version:'Dropbear SSH 2022.83',
    security_zone:'HMI Zone', criticality:'medium',
    notes:'*** ASSET NON DOCUMENTATO *** SSH Dropbear 2022.83 + LPD printer (515) invece di HTTP',
    ports:[
      {port:22,  protocol:'tcp', service:'ssh',     version:'Dropbear sshd 2022.83', state:'open', is_required:0},
      {port:515, protocol:'tcp', service:'printer',  version:'',                     state:'open', is_required:0},
    ]},

  // === ZONE 3 - REMOTE/INFRA ===
  { ip:'172.16.239.2', mac:'EC:EB:B8:B5:09:50', vendor:'Hewlett Packard Enterprise',
    device_type:'Switch', device_model:'HP J9777A 2530-8G Switch', firmware_version:'YA.16.04.0008 (2017)',
    security_zone:'Infrastructure Zone', criticality:'high',
    notes:'*** TELNET ABILITATO *** Switch OT. SSH: Mocana NanoSSH 6.3. HTTP: eHTTP v2.0.',
    ports:[
      {port:22, protocol:'tcp', service:'ssh',    version:'Mocana NanoSSH 6.3', state:'open', is_required:1},
      {port:23, protocol:'tcp', service:'telnet', version:'',                   state:'open', is_required:0},
      {port:80, protocol:'tcp', service:'http',   version:'eHTTP v2.0',         state:'open', is_required:0},
    ]},
  { ip:'172.16.239.254', mac:'00:C0:A2:09:60:C4', vendor:'Secomea (Intermedium A/S)',
    device_type:'Router', device_model:'SiteManager', firmware_version:'Apache httpd',
    security_zone:'Remote Access Zone', criticality:'high',
    notes:'Router accesso remoto. HTTPS autenticato (401). Porta 8080 da verificare.',
    ports:[
      {port:443,  protocol:'tcp', service:'https',     version:'Apache', state:'open', is_required:1},
      {port:8080, protocol:'tcp', service:'http-proxy', version:'',       state:'open', is_required:0},
    ]},

  // === ZONE 4 - UNCLASSIFIED ===
  { ip:'172.16.224.10', mac:'14:4F:D7:CD:E5:44', vendor:'D&S Cable Industries (HK)',
    device_type:'Unknown', device_model:'Windows/VMware host',
    security_zone:'Unclassified', criticality:'high',
    notes:'*** ASSET NON DOCUMENTATO *** Windows+VMware in rete OT. SMB 445 aperto. Porte VMware 902,912.',
    ports:[
      {port:135, protocol:'tcp', service:'msrpc',         state:'open', is_required:0},
      {port:139, protocol:'tcp', service:'netbios-ssn',   state:'open', is_required:0},
      {port:445, protocol:'tcp', service:'microsoft-ds',  state:'open', is_required:0},
      {port:902, protocol:'tcp', service:'VMware SOAP',   state:'open', is_required:0},
      {port:912, protocol:'tcp', service:'VMware Auth',   state:'open', is_required:0},
      {port:161, protocol:'udp', service:'snmp',          state:'open|filtered', is_required:0},
    ]},
]
```

---

## NOTE IMPORTANTI PER IL DASHBOARD

### analysisService.js — REGOLE EXTRA DA AGGIUNGERE

Il `dashboard.md` contiene `RULES` ma mancano le regole per i finding specifici F-002 e F-006.
Aggiungi queste regole nel file `analysisService.js`:

```javascript
// Regola aggiuntiva: B&R TCP/50000 senza auth con dati produzione
{
  code: 'F-BR-NOAUTH-PRODUCTION',
  check: (asset, ports) =>
    ports.some(p => p.port === 50000 && p.state === 'open') &&
    asset.vendor && asset.vendor.toLowerCase().includes('b&r'),
  title: 'Accesso non autenticato TCP/50000 — dati produzione esposti',
  description: 'Il socket TCP 50000 accetta connessioni senza autenticazione e restituisce immediatamente dati di produzione in chiaro (pesi, ordini, username supervisor).',
  cvss_score: 9.8,
  cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
  severity: 'critical',
  iec62443_sr: ['SR 2.1', 'SR 4.1', 'SR 4.2'],
  remediation: '1. ACL switch: TCP/50000 solo da IP autorizzati\n2. Contattare Idecon/B&R per meccanismi auth\n3. Non esporre su segmenti non fidati',
  remediation_priority: 'Immediate'
},
// Regola aggiuntiva: SMB in rete OT
{
  code: 'F-SMB-IN-OT',
  check: (asset, ports) => ports.some(p => p.port === 445 && p.state === 'open'),
  title: 'SMB (porta 445) aperto in rete OT — rischio ransomware/lateral movement',
  description: 'La presenza di SMB in una rete OT è un vettore primario per ransomware (WannaCry, NotPetya) e lateral movement.',
  cvss_score: 7.8,
  cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
  severity: 'high',
  iec62443_sr: ['SR 5.1', 'SR 7.7'],
  remediation: '1. Identificare e isolare il device\n2. Bloccare porta 445 via ACL\n3. Disabilitare SMBv1',
  remediation_priority: 'Immediate'
},
```

### Modifica seed.js rispetto a dashboard.md originale

Il `dashboard.md` include nel seed solo 15 asset e alcuni non hanno i MAC address corretti.
Usa il blocco `seedAssets` sopra che include:
- Tutti i 17 asset con MAC address reali verificati
- 3 asset non documentati (`.111`, `.121`, `.10`)
- Banner B&R con dati produzione reali
- Status PLC con minor fault dove rilevato

### Files già disponibili su Kali dopo assessment

```
~/assessment/raw/
  discovery.xml     — nmap host discovery (18 host)
  portscan.xml      — port scan tutte le porte OT
  versions.xml      — service version detection
  enip.xml          — EtherNet/IP scan Omron
  fins.xml          — FINS scan Omron
  unknown_10.xml    — probe device .10
  http_banners.txt  — banner HTTP Hakko + HPE switch
  br_banners.txt    — banner B&R TCP/50000 con dati produzione
  snmp.txt          — SNMP (timeout = community 'public' non accettata)

~/assessment/reports/
  report_iec62443.html  — report HTML completo (78KB)
  report_iec62443.pdf   — report PDF (111KB, via weasyprint)
  asset_inventory.xlsx  — Excel 4 fogli (15KB)
  assets.csv            — CSV asset
  findings.csv          — CSV findings
  assessment_data.json  — JSON dati completi (26KB)
```

Il `reportService.js` del dashboard potrà usare questi file come reference o generarne di nuovi.

---

## MODBUS SCAN RESULT

**Porta 502/tcp (Modbus) CHIUSA su tutti i 17 host** — nessun device usa Modbus TCP.
Protocolli OT confermati nell'impianto: EtherNet/IP (44818), FINS (9600), OPC-UA (4840), TCP/50000 (Idecon).
Modbus assente — nessun finding aggiuntivo da aggiungere.

---

## SUMMARY STATISTICHE

| Metrica | Valore |
|---------|--------|
| Host attivi trovati | 17 (+ Kali = 18) |
| Asset non documentati | 3 (.10, .111, .121) |
| Finding totali | 10 |
| Critical | 2 (F-001 Telnet, F-002 B&R noauth) |
| High | 4 (F-003 FINS, F-004 ENIP, F-005 HTTP HMI, F-006 SMB/VMware) |
| Medium | 4 (F-007 undoc, F-008 OPC-UA, F-009 Secomea 8080, F-010 SSH HMI) |
| SR non conformi | 12 su 38 verificati |
| SR parziali | 7 |
| SR conformi | 1 (SR 2.11 Timestamps) |

---

*Generato da: OT Assessment IEC 62443 — sessione 2026-03-19 — Kali 172.16.224.250*
