

| LINEE GUIDA: REQUISITI MINIMI DI SICUREZZA OT / ICS IEC 62443 |
| :---: |

| Riferimento Normativo | Standard Internazionale IEC 62443 |
| :---- | :---- |
| **Applicabilità** | Linee di Produzione, Macchine Interconnesse (OEM), Reti di Fabbrica |
| **Dipartimento** | Tecnopack OT Security |

# **Obiettivo del documento**

Questo documento definisce i requisiti minimi di sicurezza OT / ICS per le macchine e le linee Tecnopack, traducendo la IEC 62443 in profili pratici e applicabili ai nostri impianti.\[3\]

L’obiettivo è dare a progettisti, service e IT/OT del cliente uno schema chiaro di cosa è “base”, cosa è “standard” e cosa è “avanzato” in termini di sicurezza, evitando approcci “tutto o niente”.

 

| Profilo | Security Level di riferimento | Ambito tipico | Requisiti principali |
| ----- | ----- | ----- | ----- |
| Base | SL‑1 | Macchine singole o isole macchina in reti poco esposte | Hardening minimo, password robuste, segmentazione base, accesso remoto sicuro tramite Secomea, backup dei progetti. \[3\] |
| Standard | SL‑2 | Linee di produzione interconnesse, clienti con requisiti NIS2 / audit | Tutto il profilo Base \+ firewall stateful di zona, segmentazione in zone/condotti, logging strutturato, accesso remoto con MFA e identità centralizzate. \[3\] |
| Advanced | SL‑2+ | Impianti critici (es. Pharma, high‑end) e integrazione con SOC/IDS centrale | Tutto il profilo Standard \+ monitoraggio continuo IDS (SPAN \+ predisposizione TAP), integrazione con piattaforme di analisi, policy rafforzate su criptografia e gestione delle vulnerabilità. \[3\] |

Le sezioni successive descrivono l’architettura di riferimento Tecnopack (“Tecnopack Secure Blueprint”) e mappano i profili sopra ai Foundational Requirements (FR 1–7) della IEC 62443

# **1  LA STRATEGIA DEI LIVELLI DI SICUREZZA (SECURITY LEVELS)**

L'approccio alla cybersecurity industriale non può essere "tutto o niente". La norma IEC 62443 definisce i **Security Level (SL)** per procedere a step.

Per le nostre macchine, la roadmap strategica è la seguente:

* **Traguardo Attuale (SL-1):** Protezione contro violazioni casuali o accidentali (es. un manutentore che sbaglia cavo, un virus generico su una chiavetta USB). Raggiungere un SL-1 solido ci posiziona già nel top di mercato rispetto ai competitor che lasciano le reti "piatte" e aperte.  
* **Obiettivo a Medio Termine (SL-2):** Protezione contro attacchi intenzionali condotti con risorse limitate (es. malware mirati, tentativi di accesso non autorizzati dall'esterno). È il livello richiesto oggi dai grandi gruppi industriali (es. Pharma, Food & Beverage) e dalle nuove normative europee (NIS2 / Cyber Resilience Act).

## **2  L'ARCHITETTURA DI RIFERIMENTO TECNOPACK (TECNOPACK SECURE BLUEPRINT)**

Per garantire la massima sicurezza senza impattare la stabilità operativa (Safety e Determinismo) delle nostre macchine, Tecnopack adotta la seguente architettura ibrida e scalabile:

* **Accesso Remoto (Teleassistenza):** Utilizzo di **Secomea Prime** con integrazione **Azure AD (Entra ID)**. Questo garantisce un approccio Zero Trust, Multi-Factor Authentication (MFA) e gestione centralizzata delle identità, coprendo pienamente i requisiti di identificazione forte (FR 1).  
* **Accesso Locale (Fabbrica-Macchina):** Utilizzo di **Firewall Stateful industriali** (es. Siemens Scalance). Si evita l'uso di firewall UTM/NGFW a bordo macchina per azzerare i costi di licenza ricorrenti per il cliente finale e prevenire latenze anomale sui protocolli Safety (Profisafe/CIP Safety). Il firewall Stateful gestisce autenticazione locale, logging (SR 2.8) e blocco rigido delle porte non necessarie (Deny by default).  
* **Monitoraggio Interno (IDS \- Scalabile):** Le mancanze dei firewall Stateful in termini di ispezione profonda (DPI) sono compensate da analizzatori passivi open-source (es. **Malcolm/Suricata**). L'acquisizione del traffico è scalabile in base alle richieste del cliente:  
  * *Standard:* Utilizzo di **Port Mirroring (SPAN)** tramite lo switch managed di macchina.  
  * *Advanced:* Utilizzo di **sonde TAP hardware** (Fail-safe) per garantire zero packet-loss in ambienti critici.

## **3  I 7 PILASTRI (FOUNDATIONAL REQUIREMENTS \- FR)**

Di seguito l'elenco dei requisiti minimi indispensabili per la messa in sicurezza dell'impianto, basati sulle policy della nostra Dashboard OT.

### **FR 1: Controllo dell'Identificazione e Autenticazione (IAC)**

*Garantire che solo utenti e dispositivi legittimi accedano al sistema.*

* **SR 1.3 \- Account Management:** Integrazione con Azure AD (via Secomea) per i profili remoti. Gestione rigida dei profili locali tramite firewall.  
* **SR 1.7 \- Password Strength:** Imposizione di password complesse, MFA per gli accessi remoti, e procedure di rotazione.  
* **SR 1.2 \- Device Identification:** I componenti hardware (PLC, HMI, Inverter) devono essere identificati univocamente prima di poter comunicare in rete.

### **FR 2: Controllo degli Utilizzi (UC)**

*Limitare i privilegi al minimo necessario.*

* **SR 2.1 \- Authorization Enforcement:** Accesso basato sui ruoli (RBAC).  
* **SR 2.8 \- Auditable Events (Log):** Tutti i sistemi critici e i firewall di frontiera generano file di log degli accessi.

### **FR 3: Integrità del Sistema (SI)**

*Prevenire modifiche non autorizzate ai software di macchina.*

* **SR 3.2 \- Malicious Code Protection:** Protezione dell'ambiente OT da malware, limitando caricamenti di file non verificati tramite USB o reti esterne.  
* **SR 3.4 \- Software Integrity:** Garanzia che il firmware dei PLC o i file di ricetta non subiscano alterazioni malevole durante i trasferimenti.

### **FR 4: Riservatezza dei Dati (DC)**

*Proteggere il know-how e i dati di produzione.*

* **SR 4.1 \- Information Confidentiality:** Dati sensibili non devono essere leggibili in chiaro se intercettati.  
* **SR 4.3 \- Use of Cryptography:** Utilizzo di tunnel cifrati VPN (Secomea) e protocolli TLS per le comunicazioni esterne all'isola macchina.

### **FR 5: Restrizione del Flusso di Dati (RDF)**

*Il cuore dell'architettura OT: impedire la libera circolazione del traffico.*

* **SR 5.1 \- Network Segmentation:** Divisione fisica o logica della macchina in "Zone" discrete.  
* **SR 5.2 \- Zone Boundary Protection:** Demandata allo Stateful Firewall di macchina. Regola base: *Deny by default, allow by exception*.

### **FR 6: Risposta Tempestiva agli Eventi (TRE)**

*Accorgersi degli attacchi in tempo reale.*

* **SR 6.2 \- Continuous Monitoring:** Uso di IDS passivi (es. Malcolm) interfacciati tramite porte SPAN/TAP per rilevare anomalie.

### **FR 7: Disponibilità delle Risorse (RA)**

*Garantire la continuità produttiva e il ripristino post-disastro.*

* **SR 7.8 \- Asset Inventory:** Tracciamento tramite la *Dashboard IEC 62443* proprietaria Tecnopack.  
* **SR 7.3 \- Control System Backup:** Procedure di backup schedulate e verificate dei progetti PLC/HMI per Disaster Recovery.  
* **SR 7.1 \- DoS Protection:** Protezione delle reti interne garantita dal blocco stateful in ingresso sul firewall di zona.

# **4  PIANO D'AZIONE OPERATIVO (LA "TOP 3")**

Per portare le nostre macchine verso la conformità SL-1 / SL-2, l'azione si concentra prioritariamente su tre fronti operativi:

1. **Mappare (SR 7.8):** Utilizzo della nostra *Dashboard IEC 62443* per il tracciamento e la gestione dell'inventario e delle vulnerabilità note (CVE).  
2. **Dividere e Controllare (SR 5.1 / 5.2 / 1.3):** Uso di Stateful Firewall per l'accesso locale di stabilimento e Secomea Prime (Auth Azure) per l'accesso remoto sicuro.  
3. **Ascoltare (SR 6.2):** Macchine predisposte "Cyber-Ready" con switch managed configurati in Port Mirroring (SPAN) di default, con possibilità di upgrade a sonde TAP Hardware per i clienti più esigenti.

