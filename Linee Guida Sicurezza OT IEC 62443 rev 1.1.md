

| LINEE GUIDA: REQUISITI MINIMI DI SICUREZZA OT / ICS IEC 62443 |
| :---: |

| Riferimento Normativo | Standard Internazionale IEC 62443 |
| :---- | :---- |
| **Applicabilità** | Linee di Produzione, Macchine Interconnesse (OEM), Reti di Fabbrica |
| **Dipartimento** | Tecnopack OT Security |

# **1  LA STRATEGIA DEI LIVELLI DI SICUREZZA (SECURITY LEVELS)**

L'approccio alla cybersecurity industriale non può essere "tutto o niente". La norma IEC 62443 definisce i **Security Level (SL)** per procedere a step.

Per le nostre macchine, la roadmap strategica è la seguente:

* **Traguardo Attuale (SL-1)**: Protezione contro violazioni casuali o accidentali (es. un manutentore che sbaglia cavo, un virus generico su una chiavetta USB). Raggiungere un SL-1 solido ci posiziona già nel top di mercato rispetto ai competitor che lasciano le reti "piatte" e aperte.  
* **Obiettivo a Medio Termine (SL-2)**: Protezione contro attacchi intenzionali condotti con risorse limitate (es. malware mirati, tentativi di accesso non autorizzati dall'esterno). È il livello richiesto oggi dai grandi gruppi industriali (es. Pharma, Food & Beverage) e dalle nuove normative europee (NIS2 / Cyber Resilience Act).

## **2  I 7 PILASTRI (FOUNDATIONAL REQUIREMENTS \- FR)**

Di seguito l'elenco dei requisiti minimi indispensabili per la messa in sicurezza dell'impianto, basati sulle policy della nostra Dashboard OT.

### **FR 1: Controllo dell'Identificazione e Autenticazione (IAC)**

*Garantire che solo utenti e dispositivi legittimi accedano al sistema.*

* **SR 1.3 \- Account Management:** Ogni operatore, manutentore o amministratore deve avere un profilo univoco. Nessuna condivisione di credenziali.  
* **SR 1.7 \- Password Strength:** Imposizione di password complesse e di procedure di rotazione.  
* **SR 1.2 \- Device Identification:** I componenti hardware (PLC, HMI, Inverter) devono essere identificati univocamente prima di poter comunicare in rete.

### **FR 2: Controllo degli Utilizzi (UC)**

*Limitare i privilegi al minimo necessario.*

* **SR 2.1 \- Authorization Enforcement:** Accesso basato sui ruoli (RBAC). Un operatore non deve poter modificare i parametri di rete che competono all'amministratore IT.  
* **SR 2.8 \- Auditable Events (Log):** Tutti i sistemi critici devono generare file di log (chi ha fatto cosa, da dove e quando) da archiviare in modo centralizzato.

### **FR 3: Integrità del Sistema (SI)**

*Prevenire modifiche non autorizzate ai software di macchina.*

* **SR 3.2 \- Malicious Code Protection:** Protezione dell'ambiente OT da malware, limitando caricamenti di file non verificati tramite USB o reti esterne.  
* **SR 3.4 \- Software Integrity:** Garanzia che il firmware dei PLC o i file di ricetta non subiscano alterazioni malevole durante i trasferimenti.

### **FR 4: Riservatezza dei Dati (DC)**

*Proteggere il know-how e i dati di produzione.*

* **SR 4.1 \- Information Confidentiality:** Dati sensibili (es. ricette segrete, parametri di produzione) non devono essere leggibili in chiaro se intercettati.  
* **SR 4.3 \- Use of Cryptography:** Utilizzo di protocolli crittografici (es. TLS/SSL) per le comunicazioni da e verso l'esterno dell'isola macchina.

### **FR 5: Restrizione del Flusso di Dati (RDF)**

*Il cuore dell'architettura OT: impedire la libera circolazione del traffico.*

* **SR 5.1 \- Network Segmentation:** Divisione fisica o logica (VLAN) della macchina in "Zone" discrete (es. Zona PLC, Zona HMI).  
* **SR 5.2 \- Zone Boundary Protection:** Utilizzo di Firewall/Router industriali per creare "Conduit" sicuri tra le zone. Regola base: *Deny by default, allow by exception* (tutto chiuso, apro solo le porte necessarie, es. TCP 102 per Siemens S7 o TCP 44818 per Omron EtherNet/IP).

### **FR 6: Risposta Tempestiva agli Eventi (TRE)**

*Accorgersi degli attacchi in tempo reale.*

* **SR 6.2 \- Continuous Monitoring:** Implementazione di sonde hardware (TAP) e software di Deep Packet Inspection (es. Malcolm/Suricata/Zeek) per analizzare passivamente il traffico OT e generare allarmi su comportamenti anomali senza rallentare la macchina.

### **FR 7: Disponibilità delle Risorse (RA)**

*Garantire la continuità produttiva e il ripristino post-disastro.*

* **SR 7.8 \- Asset Inventory:** Inventario costantemente aggiornato di tutti i dispositivi in rete (Indirizzi IP, MAC, Vendor, Versioni Firmware). *Non si può proteggere ciò che non si conosce.*  
* **SR 7.3 \- Control System Backup:** Procedure di backup schedulate e verificate dei progetti PLC/HMI per garantire un ripristino immediato (Disaster Recovery).  
* **SR 7.1 \- DoS Protection:** Protezione delle reti interne di macchina da tempeste di traffico (Denial of Service) che potrebbero far collassare i PLC.

# **3  PIANO D'AZIONE OPERATIVO (LA "TOP 3")**

Per portare le nostre macchine verso la conformità SL-1 / SL-2, l'azione si concentra prioritariamente su tre fronti operativi:

1. **Mappare (SR 7.8):** Utilizzo della nostra *Dashboard IEC 62443* per il tracciamento e la gestione dell'inventario e delle vulnerabilità note (CVE).  
2. **Dividere (SR 5.1 / 5.2):** Standardizzazione di switch managed e router (es. Secomea) per segmentare il PLC e l'HMI dalla rete di stabilimento del cliente.  
3. **Ascoltare (SR 6.2):** Predisposizione per l'inserimento di sonde TAP Hardware e sistemi NMS passivi per il monitoraggio in continuo del traffico senza impatto sul determinismo della macchina

