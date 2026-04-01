/**
 * Policy standard IEC 62443-3-3 per zona.
 * Basate sulle Linee Guida Sicurezza OT IEC 62443 rev 1.1 — Tecnopack OT Security.
 *
 * Formato testo: compatibile con output AI (Obiettivo / Ambito / Requisiti).
 * Source: 'standard' — usato come pre-compilazione iniziale nel WizardStep6.
 */

function policyText(obiettivo, ambito, requisiti) {
  return `**Obiettivo:** ${obiettivo}\n\n**Ambito:** ${ambito}\n\n**Requisiti:**\n${requisiti.map(r => `- ${r}`).join('\n')}`
}

const STANDARD_POLICIES = {

  // ══════════════════════════════════════════════════════════
  //  PLC-ZONE  —  SL-2  —  9 SR baseline
  // ══════════════════════════════════════════════════════════
  'PLC-Zone': {

    'SR 1.2': {
      title: 'Device Identification and Authentication',
      text: policyText(
        'Garantire che ogni PLC e dispositivo di campo sia identificato univocamente prima di poter comunicare nella rete OT della zona PLC.',
        'Tutti i PLC, controllori programmabili, moduli I/O remoti e dispositivi di campo (inverter, robot) connessi alla subnet della zona PLC.',
        [
          'Ogni PLC deve avere indirizzo IP statico assegnato e documentato nell\'inventario asset della Dashboard IEC 62443.',
          'Il numero di serie e la versione firmware del PLC devono essere registrati e verificabili tramite interrogazione diretta al dispositivo.',
          'Le comunicazioni PROFINET/EtherNet/IP devono avvenire solo tra dispositivi con identità verificata registrata nell\'inventario.',
          'Eventuali nuovi dispositivi collegati alla subnet PLC devono essere approvati dal responsabile tecnico e registrati prima dell\'operatività.',
          'Riferimento normativo: IEC 62443-3-3 SR 1.2 — Device Identification and Authentication.'
        ]
      )
    },

    'SR 3.2': {
      title: 'Malicious Code Protection',
      text: policyText(
        'Proteggere la zona PLC da introduzione di malware tramite supporti rimovibili, reti esterne o aggiornamenti software non verificati.',
        'Tutti i PLC, i sistemi di programmazione (laptop engineering, panel) e i PC connessi alla zona PLC.',
        [
          'Nessun supporto USB non autorizzato deve essere collegato direttamente ai PLC o ai PC di programmazione OT.',
          'I file di progetto PLC (.ap1, .zap15, .prj) devono essere verificati con hash SHA-256 prima del caricamento sul dispositivo.',
          'I laptop di engineering devono essere dedicati esclusivamente alla zona OT e non utilizzati per navigazione internet.',
          'Gli aggiornamenti firmware dei PLC devono provenire esclusivamente dal vendor ufficiale con firma verificata.',
          'Riferimento normativo: IEC 62443-3-3 SR 3.2 — Malicious Code Protection (FR3 — System Integrity).'
        ]
      )
    },

    'SR 3.4': {
      title: 'Software and Firmware Integrity',
      text: policyText(
        'Garantire che il firmware dei PLC e i programmi applicativi non subiscano alterazioni non autorizzate durante trasferimenti o aggiornamenti.',
        'Firmware PLC, programmi applicativi e file di ricetta caricati sui PLC della zona PLC.',
        [
          'Prima di ogni download firmware, calcolare e documentare l\'hash SHA-256 del file sorgente e verificarlo dopo il caricamento.',
          'I progetti PLC devono essere firmati digitalmente dal responsabile tecnico prima del deployment in produzione.',
          'Qualsiasi discrepanza nel checksum deve bloccare automaticamente il processo di aggiornamento e generare un alert al responsabile sicurezza.',
          'I file di ricetta trasferiti ai PLC devono transitare su canale autenticato (es. FTP sicuro, OPC-UA Write autenticato).',
          'Riferimento normativo: IEC 62443-3-3 SR 3.4 — Software and Firmware Integrity (FR3 — System Integrity).'
        ]
      )
    },

    'SR 4.1': {
      title: 'Information Confidentiality — OPC-UA',
      text: policyText(
        'Proteggere la confidenzialità dei dati di processo (ricette, parametri produttivi) trasmessi via OPC-UA tra PLC e sistemi SCADA/HMI.',
        'Tutti i canali OPC-UA attivi nella zona PLC, incluse le connessioni verso supervisione SCADA e cloud.',
        [
          'Le sessioni OPC-UA devono utilizzare Security Policy Basic256Sha256 con modalità SignAndEncrypt.',
          'I certificati OPC-UA devono essere emessi da una CA interna e rinnovati ogni 24 mesi.',
          'Le variabili di processo critiche (es. parametri di ricetta, set-point di produzione) devono essere accessibili solo a client OPC-UA autenticati.',
          'Il server OPC-UA deve esporre solo i namespace strettamente necessari (principio di minima esposizione).',
          'L\'accesso in lettura e scrittura alle variabili di processo deve essere limitato per ruolo (RBAC OPC-UA).',
          'Riferimento normativo: IEC 62443-3-3 SR 4.1 — Information Confidentiality (FR4 — Data Confidentiality).'
        ]
      )
    },

    'SR 5.1': {
      title: 'Network Segmentation',
      text: policyText(
        'Isolare la zona PLC dalla rete IT aziendale e da altre zone OT tramite segmentazione fisica e logica, limitando la superficie di attacco.',
        'Tutti i PLC, controllori e dispositivi di campo della zona PLC, incluse le comunicazioni PROFINET, Modbus TCP ed EtherNet/IP.',
        [
          'La zona PLC deve essere isolata tramite firewall industriale o router con ACL dedicate e documentate.',
          'Il traffico in ingresso deve essere limitato ai soli protocolli necessari: PROFINET (UDP/34964), S7 (TCP/102), EtherNet/IP (TCP-UDP/44818).',
          'Nessun accesso diretto dalla rete IT — tutto il traffico verso i PLC deve transitare attraverso la DMZ industriale.',
          'Gli accessi remoti ai PLC devono avvenire esclusivamente tramite VPN con autenticazione a due fattori (MFA).',
          'Riferimento normativo: IEC 62443-3-3 SR 5.1 — Network Segmentation (FR5 — Restricted Data Flow).'
        ]
      )
    },

    'SR 5.2': {
      title: 'Zone Boundary Protection',
      text: policyText(
        'Controllare e filtrare tutto il traffico che attraversa il confine della zona PLC tramite firewall industriale con policy "Deny by default".',
        'Il firewall/router industriale al confine della zona PLC e tutti i conduit verso la zona HMI, DMZ e reti esterne.',
        [
          'Il firewall industriale deve applicare la regola "Deny by default, allow by exception" su tutte le interfacce della zona PLC.',
          'Devono essere aperte solo le porte strettamente necessarie: TCP/102 (S7), TCP-UDP/44818 (EtherNet/IP), TCP/4840 (OPC-UA), UDP/34964 (PROFINET).',
          'Le regole ACL devono essere documentate in una matrice di flussi approvata dal responsabile sicurezza e soggetta a revisione semestrale.',
          'Tutte le connessioni rifiutate devono essere loggate per analisi di sicurezza e correlazione degli incidenti.',
          'Riferimento normativo: IEC 62443-3-3 SR 5.2 — Zone Boundary Protection (FR5 — Restricted Data Flow).'
        ]
      )
    },

    'SR 7.1': {
      title: 'DoS Protection',
      text: policyText(
        'Proteggere i PLC e la rete di campo da attacchi Denial of Service che potrebbero compromettere la continuità produttiva e il determinismo dei cicli di controllo.',
        'Switch industriali, infrastruttura di rete e PLC della zona PLC, con particolare attenzione alle reti PROFINET e EtherNet/IP time-sensitive.',
        [
          'Gli switch industriali devono essere configurati con Storm Control per limitare il traffico broadcast/multicast a max 10% della banda.',
          'Il rate limiting deve essere abilitato sulle porte degli switch per prevenire flood di pacchetti verso i PLC.',
          'I PLC devono essere connessi a switch dedicati separati dal traffico di supervisione HMI.',
          'Il watchdog PROFINET/EtherNet/IP deve essere configurato per rilevare perdita di comunicazione entro 100ms e portare gli assi in Safe State.',
          'Riferimento normativo: IEC 62443-3-3 SR 7.1 — DoS Protection (FR7 — Resource Availability).'
        ]
      )
    },

    'SR 7.3': {
      title: 'Control System Backup',
      text: policyText(
        'Garantire il ripristino rapido dei programmi PLC e delle configurazioni di controllo in caso di guasto hardware o attacco informatico.',
        'Tutti i programmi applicativi, configurazioni hardware, parametri di rete e firmware dei PLC della zona PLC.',
        [
          'I progetti PLC devono essere sottoposti a backup automatico al termine di ogni sessione di programmazione o modifica.',
          'I backup devono essere archiviati in un repository sicuro separato dalla rete OT (NAS isolato o storage crittografato).',
          'La procedura di ripristino deve essere testata almeno semestralmente con documentazione del Recovery Time Objective (RTO ≤ 4 ore).',
          'I backup devono includere: programma applicativo, configurazione hardware, parametri di rete, versione firmware e file di ricetta.',
          'Riferimento normativo: IEC 62443-3-3 SR 7.3 — Control System Backup (FR7 — Resource Availability).'
        ]
      )
    },

    'SR 7.8': {
      title: 'Asset Inventory',
      text: policyText(
        'Mantenere un inventario accurato e costantemente aggiornato di tutti i dispositivi presenti nella zona PLC per garantire visibilità totale sulla superficie di attacco.',
        'Tutti i PLC, moduli I/O, inverter, robot e dispositivi di campo connessi alla rete della zona PLC.',
        [
          'Ogni dispositivo deve essere registrato nella Dashboard IEC 62443 con: IP, MAC, vendor, modello, versione firmware, data ultimo aggiornamento.',
          'L\'inventario deve essere aggiornato entro 24 ore da qualsiasi aggiunta, rimozione o modifica di dispositivi nella zona.',
          'Lo scanner automatico della Dashboard deve essere eseguito mensilmente per rilevare dispositivi non autorizzati o con firmware obsoleto.',
          'Qualsiasi dispositivo non presente nell\'inventario rilevato nella subnet PLC deve generare un alert di sicurezza immediato.',
          'Riferimento normativo: IEC 62443-3-3 SR 7.8 — Asset Inventory (FR7 — Resource Availability).'
        ]
      )
    }
  },

  // ══════════════════════════════════════════════════════════
  //  HMI-ZONE  —  SL-2  —  11 SR baseline
  // ══════════════════════════════════════════════════════════
  'HMI-Zone': {

    'SR 1.2': {
      title: 'Device Identification and Authentication',
      text: policyText(
        'Identificare univocamente tutti i pannelli HMI e i PC SCADA prima che possano comunicare con i PLC della zona PLC.',
        'Tutti i pannelli HMI, PC SCADA, terminali operatore e thin client della zona HMI.',
        [
          'Ogni HMI deve avere indirizzo IP statico e MAC address documentati nell\'inventario della Dashboard IEC 62443.',
          'I dispositivi HMI devono autenticarsi via certificato o chiave pre-condivisa prima di accedere ai dati di processo dei PLC.',
          'I terminali non registrati nell\'inventario non devono ricevere indirizzo IP tramite DHCP nella subnet HMI.',
          'Il numero di serie di ogni pannello HMI deve essere associato alla sua posizione fisica nell\'impianto.',
          'Riferimento normativo: IEC 62443-3-3 SR 1.2 — Device Identification and Authentication (FR1 — IAC).'
        ]
      )
    },

    'SR 1.3': {
      title: 'Account Management',
      text: policyText(
        'Garantire che ogni operatore e manutentore abbia un account personale e non condiviso per accedere agli HMI, eliminando account generici.',
        'Tutti gli account utente configurati su HMI, PC SCADA e sistemi di supervisione della zona HMI.',
        [
          'Nessun account condiviso o generico (es. "admin", "operator", "guest") deve essere attivo sugli HMI di produzione.',
          'Gli account devono essere associati a persone fisiche identificabili con nome, cognome e ruolo aziendale.',
          'Gli account di personale non più in servizio devono essere disabilitati entro 24 ore dalla cessazione del rapporto.',
          'Un amministratore di sistema deve approvare formalmente la creazione di ogni nuovo account operatore.',
          'La lista degli account attivi deve essere revisionata trimestralmente e documentata.',
          'Riferimento normativo: IEC 62443-3-3 SR 1.3 — Account Management (FR1 — IAC).'
        ]
      )
    },

    'SR 1.7': {
      title: 'Strength of Password-based Authentication',
      text: policyText(
        'Imporre policy di password robuste su tutti i sistemi HMI e SCADA per prevenire accessi non autorizzati tramite attacchi a dizionario o brute force.',
        'Tutti i sistemi di autenticazione degli HMI, PC SCADA e pannelli operatore della zona HMI.',
        [
          'Le password devono avere lunghezza minima di 12 caratteri con maiuscole, minuscole, numeri e almeno un carattere speciale.',
          'La rotazione delle password deve avvenire ogni 90 giorni; le ultime 5 password non devono poter essere riutilizzate.',
          'Il blocco automatico dell\'account deve scattare dopo 5 tentativi di accesso falliti consecutivi, con sblocco da parte dell\'amministratore.',
          'Le password di default del vendor (es. "1234", "admin") devono essere cambiate prima della prima messa in servizio della macchina.',
          'Riferimento normativo: IEC 62443-3-3 SR 1.7 — Strength of Password-based Authentication (FR1 — IAC).'
        ]
      )
    },

    'SR 2.1': {
      title: 'Authorization Enforcement — RBAC',
      text: policyText(
        'Limitare i privilegi degli utenti HMI al minimo necessario per il loro ruolo operativo (principio del minimo privilegio — Least Privilege).',
        'Tutti gli account e le funzionalità accessibili tramite HMI, SCADA e sistemi di supervisione della zona HMI.',
        [
          'Definire almeno tre livelli di accesso: Operatore (visualizzazione e allarmi), Supervisore (modifica parametri), Amministratore (configurazione sistema).',
          'Gli operatori di produzione non devono poter modificare parametri di rete, impostazioni di sicurezza o programmi PLC.',
          'L\'accesso alle funzioni critiche (cambio ricetta, override allarmi di sicurezza) deve richiedere doppia autenticazione.',
          'Le assegnazioni di ruolo devono essere documentate in una matrice RBAC approvata e soggetta a revisione semestrale.',
          'Riferimento normativo: IEC 62443-3-3 SR 2.1 — Authorization Enforcement (FR2 — Use Control).'
        ]
      )
    },

    'SR 2.8': {
      title: 'Auditable Events — Log',
      text: policyText(
        'Registrare tutti gli eventi rilevanti di accesso e operazione sugli HMI per garantire la tracciabilità e supportare analisi forensi in caso di incidente.',
        'Tutti gli HMI e PC SCADA della zona HMI che accedono a dati di processo critici o eseguono operazioni di supervisione.',
        [
          'Ogni accesso (login/logout), modifica parametri e allarme critico deve essere registrato con timestamp, utente, workstation e azione eseguita.',
          'I log devono essere trasmessi in tempo reale a un server syslog centralizzato e archiviati per almeno 12 mesi.',
          'I log locali degli HMI non devono poter essere cancellati o modificati dagli operatori standard.',
          'Un report automatico settimanale deve evidenziare: accessi fuori orario, tentativi falliti, override allarmi e modifiche parametri critici.',
          'Riferimento normativo: IEC 62443-3-3 SR 2.8 — Auditable Events (FR2 — Use Control).'
        ]
      )
    },

    'SR 3.2': {
      title: 'Malicious Code Protection',
      text: policyText(
        'Proteggere i pannelli HMI e i PC SCADA dall\'introduzione di malware tramite supporti rimovibili, rete o software non verificato.',
        'Tutti i PC SCADA e pannelli HMI con sistema operativo Windows/Linux embedded della zona HMI.',
        [
          'I PC SCADA devono avere soluzione antivirus/EDR con firme aggiornate in modalità off-line (senza accesso internet diretto dalla zona OT).',
          'Le porte USB degli HMI devono essere disabilitate fisicamente o tramite policy di sistema/BIOS, salvo manutenzione programmata.',
          'Gli aggiornamenti software devono provenire da un repository interno verificato; non è ammesso il download diretto da internet.',
          'L\'esecuzione di software non incluso nella whitelist applicativa approvata deve essere bloccata.',
          'Riferimento normativo: IEC 62443-3-3 SR 3.2 — Malicious Code Protection (FR3 — System Integrity).'
        ]
      )
    },

    'SR 4.1': {
      title: 'Information Confidentiality',
      text: policyText(
        'Proteggere la riservatezza dei dati di produzione (ricette, parametri, trend storici) visualizzati e gestiti dagli HMI della zona HMI.',
        'Tutti i dati di processo, le comunicazioni HMI↔PLC e i file di ricetta gestiti nella zona HMI.',
        [
          'Le comunicazioni HMI↔PLC devono avvenire su protocolli con autenticazione (OPC-UA Security Policy Basic256Sha256, S7+ autenticato).',
          'I file di ricetta e i parametri di produzione critici devono essere cifrati a riposo sugli HMI (es. AES-256).',
          'Lo screensaver con blocco automatico deve attivarsi dopo 5 minuti di inattività per prevenire accessi fisici non autorizzati.',
          'I dati storici di processo non devono essere accessibili tramite export non controllato senza autorizzazione del supervisore.',
          'Riferimento normativo: IEC 62443-3-3 SR 4.1 — Information Confidentiality (FR4 — Data Confidentiality).'
        ]
      )
    },

    'SR 5.1': {
      title: 'Network Segmentation',
      text: policyText(
        'Isolare la zona HMI dalla rete IT aziendale e da altre zone OT per limitare la propagazione di attacchi e proteggere i sistemi di supervisione.',
        'Tutti gli HMI e PC SCADA della zona HMI e le loro connessioni di rete verso la zona PLC, IT e DMZ industriale.',
        [
          'La zona HMI deve essere su una subnet separata (VLAN dedicata) rispetto alla rete IT aziendale e alla zona PLC.',
          'Il traffico dalla rete IT verso la zona HMI deve essere bloccato di default dal firewall industriale.',
          'L\'accesso remoto agli HMI deve avvenire tramite VPN dedicata con autenticazione MFA e terminazione in DMZ industriale.',
          'La connessione diretta HMI↔internet è vietata; qualsiasi traffico verso internet deve passare per il proxy aziendale.',
          'Riferimento normativo: IEC 62443-3-3 SR 5.1 — Network Segmentation (FR5 — Restricted Data Flow).'
        ]
      )
    },

    'SR 5.2': {
      title: 'Zone Boundary Protection',
      text: policyText(
        'Controllare tutto il traffico che attraversa il confine tra la zona HMI e le zone adiacenti (PLC, IT, DMZ) tramite firewall con regole specifiche.',
        'Il firewall/router industriale al confine della zona HMI e i conduit verso la zona PLC, IT e accesso remoto.',
        [
          'Il firewall deve applicare "Deny by default" su tutte le interfacce della zona HMI.',
          'Devono essere aperte solo le porte necessarie per la supervisione: OPC-UA (TCP/4840), S7 (TCP/102), RDP/VNC solo dal jump server DMZ.',
          'Gli accessi VPN devono terminare in una DMZ industriale dedicata e non direttamente nella subnet HMI.',
          'Il firewall deve loggare e alertare su tutte le connessioni rifiutate verso gli HMI per analisi di sicurezza.',
          'Riferimento normativo: IEC 62443-3-3 SR 5.2 — Zone Boundary Protection (FR5 — Restricted Data Flow).'
        ]
      )
    },

    'SR 6.2': {
      title: 'Continuous Monitoring',
      text: policyText(
        'Monitorare in continuo il traffico e gli eventi della zona HMI per rilevare comportamenti anomali, nuovi dispositivi e tentativi di intrusione in tempo reale.',
        'La rete della zona HMI e tutte le comunicazioni tra HMI, PLC e sistemi SCADA, incluso il traffico verso la DMZ.',
        [
          'Installare una sonda TAP passiva sulla rete HMI per Deep Packet Inspection tramite sistema di monitoraggio OT (Malcolm, Suricata, Zeek).',
          'Il sistema di monitoraggio deve generare alert automatici per: nuovi dispositivi rilevati, traffico verso IP non noti, scan di rete, traffico anomalo.',
          'Gli alert devono essere inviati al responsabile sicurezza OT via email/SMS entro 5 minuti dal rilevamento.',
          'Il sistema di monitoraggio deve essere completamente passivo (TAP, non inline) per non impattare le prestazioni degli HMI.',
          'Riferimento normativo: IEC 62443-3-3 SR 6.2 — Continuous Monitoring (FR6 — Timely Response to Events).'
        ]
      )
    },

    'SR 7.8': {
      title: 'Asset Inventory',
      text: policyText(
        'Mantenere un registro completo e aggiornato di tutti gli HMI e sistemi SCADA presenti nella zona per garantire la visibilità totale dei dispositivi.',
        'Tutti i pannelli HMI, PC SCADA, terminali operatore e dispositivi di rete della zona HMI.',
        [
          'Ogni HMI deve essere registrato nella Dashboard IEC 62443 con: IP, MAC, sistema operativo, versione software SCADA, vendor, modello.',
          'La versione del software HMI (TIA Portal WinCC, FactoryTalk View, Intouch, ecc.) deve essere documentata e aggiornata ad ogni release.',
          'Qualsiasi nuovo dispositivo rilevato nella subnet HMI deve generare un alert di sicurezza immediato.',
          'L\'inventario deve essere revisionato trimestralmente dal responsabile manutenzione e confrontato con lo stato fisico dell\'impianto.',
          'Riferimento normativo: IEC 62443-3-3 SR 7.8 — Asset Inventory (FR7 — Resource Availability).'
        ]
      )
    }
  },

  // ══════════════════════════════════════════════════════════
  //  ROUTER-ZONE  —  SL-2  —  9 SR baseline
  // ══════════════════════════════════════════════════════════
  'Router-Zone': {

    'SR 1.3': {
      title: 'Account Management',
      text: policyText(
        'Garantire che ogni amministratore di rete abbia credenziali personali per accedere ai router, switch e firewall industriali della zona Router.',
        'Tutti i router, switch managed, firewall industriali e access point della zona Router.',
        [
          'Le credenziali di default del vendor (es. "admin/admin", "cisco/cisco") devono essere cambiate prima della prima messa in servizio.',
          'Ogni tecnico di rete deve avere un account personale con log di accesso separato; nessun account condiviso è ammesso.',
          'L\'accesso alla console (CLI/SSH) dei router deve essere registrato e associato a un ticket di manutenzione approvato.',
          'Gli account amministrativi devono essere protetti da autenticazione a due fattori (2FA) dove supportata dal dispositivo.',
          'Riferimento normativo: IEC 62443-3-3 SR 1.3 — Account Management (FR1 — IAC).'
        ]
      )
    },

    'SR 1.7': {
      title: 'Strength of Password-based Authentication',
      text: policyText(
        'Imporre policy di password robuste su tutti i dispositivi di rete industriali per prevenire accessi non autorizzati alla configurazione di rete.',
        'Tutti i router, switch, firewall e access point della zona Router.',
        [
          'Le password degli account di rete devono avere almeno 16 caratteri con complessità elevata (maiuscole, minuscole, numeri, simboli).',
          'Le enable password/secret dei router devono essere cifrate con algoritmo forte (bcrypt type 9) e non con MD5 (type 5, obsoleto).',
          'Nessun account senza password deve essere presente nelle configurazioni dei dispositivi di rete.',
          'Le password devono essere ruotate ogni 6 mesi o immediatamente dopo la cessazione di un amministratore di rete.',
          'Riferimento normativo: IEC 62443-3-3 SR 1.7 — Strength of Password-based Authentication (FR1 — IAC).'
        ]
      )
    },

    'SR 2.8': {
      title: 'Auditable Events — Log',
      text: policyText(
        'Registrare tutti gli eventi di accesso, modifica di configurazione e anomalia di rete sui dispositivi della zona Router per audit e analisi forense.',
        'Tutti i router, switch managed e firewall industriali della zona Router.',
        [
          'Abilitare il logging verso server syslog centralizzato su tutti i dispositivi di rete (severity informational e superiori).',
          'Ogni modifica alla configurazione di rete (running-config) deve generare un log con timestamp, utente e comando eseguito.',
          'I log devono essere archiviati per almeno 12 mesi in un sistema non modificabile dagli amministratori di rete (WORM storage).',
          'Il sistema di log deve generare alert in caso di tentativi di accesso falliti ripetuti (più di 5 in 10 minuti) su qualsiasi dispositivo.',
          'Riferimento normativo: IEC 62443-3-3 SR 2.8 — Auditable Events (FR2 — Use Control).'
        ]
      )
    },

    'SR 4.3': {
      title: 'Use of Cryptography',
      text: policyText(
        'Garantire che tutte le comunicazioni di gestione e i tunnel di accesso remoto nella zona Router siano protetti crittograficamente.',
        'Tutti i protocolli di management, i tunnel VPN e le interfacce web dei dispositivi di rete della zona Router.',
        [
          'L\'accesso remoto ai router deve avvenire solo tramite SSH v2; Telnet e SNMPv1/v2 devono essere disabilitati.',
          'I tunnel VPN per l\'accesso remoto ai sistemi OT devono usare IKEv2 con cifratura AES-256 e autenticazione tramite certificati X.509.',
          'I certificati TLS/SSL sui portali di gestione dei router devono avere validità massima 2 anni e usare SHA-256.',
          'Le interfacce web HTTPS dei dispositivi di rete devono usare TLS 1.2 o superiore (disabilitare SSLv3, TLS 1.0 e TLS 1.1).',
          'Riferimento normativo: IEC 62443-3-3 SR 4.3 — Use of Cryptography (FR4 — Data Confidentiality).'
        ]
      )
    },

    'SR 5.1': {
      title: 'Network Segmentation',
      text: policyText(
        'Assicurare che la zona Router realizzi una corretta segmentazione tra le zone OT operative, la DMZ industriale e la rete IT aziendale.',
        'L\'intera infrastruttura di routing e switching che separa le zone di sicurezza PLC, HMI, Management e DMZ industriale.',
        [
          'Implementare VLAN separate per ogni zona di sicurezza: VLAN PLC, VLAN HMI, VLAN Management, VLAN DMZ industriale.',
          'Il traffico inter-VLAN deve transitare obbligatoriamente attraverso il firewall industriale per applicazione delle regole ACL.',
          'La rete flat (senza segmentazione, tutti i dispositivi sulla stessa subnet) è vietata in tutti gli impianti OT Tecnopack.',
          'I router devono bloccare il traffico di broadcast tra zone diverse (disabilitare Proxy ARP inter-zone).',
          'Riferimento normativo: IEC 62443-3-3 SR 5.1 — Network Segmentation (FR5 — Restricted Data Flow).'
        ]
      )
    },

    'SR 5.2': {
      title: 'Zone Boundary Protection',
      text: policyText(
        'Implementare e mantenere il controllo degli accessi ai confini tra le zone OT tramite firewall industriale con politica "Deny by default".',
        'Il firewall industriale (Secomea, Hirschmann, Cisco IE) al confine di ogni zona OT e tutti i conduit inter-zona.',
        [
          'Il firewall industriale deve applicare "Deny by default, allow by exception" su tutte le interfacce inter-zona.',
          'Le regole di firewall devono essere documentate in una matrice di flussi approvata dal responsabile sicurezza.',
          'Ogni regola deve specificare IP/subnet sorgente e destinazione espliciti: nessuna regola "any-any" è ammessa.',
          'Le regole di accesso devono essere revisionate semestralmente e le regole non utilizzate da più di 90 giorni rimosse.',
          'Riferimento normativo: IEC 62443-3-3 SR 5.2 — Zone Boundary Protection (FR5 — Restricted Data Flow).'
        ]
      )
    },

    'SR 6.2': {
      title: 'Continuous Monitoring',
      text: policyText(
        'Monitorare in continuo i flussi di rete nella zona Router per rilevare anomalie di traffico, device non autorizzati e tentativi di intrusione.',
        'Tutti i link di rete gestiti dalla zona Router, inclusi i conduit tra le zone OT, la DMZ industriale e la rete IT.',
        [
          'Configurare SNMPv3 con autenticazione SHA e cifratura AES su tutti i dispositivi di rete per il monitoraggio NMS.',
          'Attivare NetFlow/sFlow sugli switch managed per l\'analisi dei flussi di traffico verso il sistema di monitoraggio OT.',
          'Il sistema NMS deve generare alert per: link down, utilizzo CPU >80%, traffico anomalo verso IP non in whitelist.',
          'I port scan interni alla rete OT devono essere rilevati e segnalati entro 1 minuto dal responsabile sicurezza.',
          'Riferimento normativo: IEC 62443-3-3 SR 6.2 — Continuous Monitoring (FR6 — Timely Response to Events).'
        ]
      )
    },

    'SR 7.1': {
      title: 'DoS Protection',
      text: policyText(
        'Proteggere l\'infrastruttura di rete OT da attacchi Denial of Service che potrebbero isolare i dispositivi di controllo o interrompere la produzione.',
        'Tutti i router e switch industriali della zona Router e i link di rete verso le zone PLC e HMI.',
        [
          'Abilitare Storm Control (broadcast, multicast, unicast) su tutte le porte degli switch industriali.',
          'Configurare QoS per dare priorità al traffico di controllo OT (PROFINET, EtherNet/IP) rispetto al traffico di supervisione e management.',
          'Abilitare Spanning Tree con protezioni BPDU Guard e Root Guard su tutte le porte access degli switch per prevenire loop di rete.',
          'Configurare Port Security per limitare il numero massimo di MAC address per porta degli switch (max 3) prevenendo MAC flooding.',
          'Riferimento normativo: IEC 62443-3-3 SR 7.1 — DoS Protection (FR7 — Resource Availability).'
        ]
      )
    },

    'SR 7.8': {
      title: 'Asset Inventory',
      text: policyText(
        'Documentare e mantenere aggiornato l\'inventario di tutti i dispositivi di rete della zona Router per garantire visibilità e controllo della superficie di attacco.',
        'Tutti i router, switch, firewall, access point e dispositivi di rete della zona Router.',
        [
          'Ogni dispositivo di rete deve essere registrato nella Dashboard con: IP management, MAC, modello, versione firmware, data ultimo aggiornamento.',
          'La configurazione attiva (running-config) di ogni router/switch deve essere salvata nel sistema di backup e versionata dopo ogni modifica.',
          'Qualsiasi nuovo dispositivo rilevato nella subnet di management deve generare un alert di sicurezza immediato.',
          'L\'inventario dei dispositivi di rete deve essere sincronizzato con la Dashboard IEC 62443 almeno mensilmente.',
          'Riferimento normativo: IEC 62443-3-3 SR 7.8 — Asset Inventory (FR7 — Resource Availability).'
        ]
      )
    }
  },

  // ══════════════════════════════════════════════════════════
  //  DRIVER-ZONE  —  SL-1  —  8 SR baseline
  // ══════════════════════════════════════════════════════════
  'Driver-Zone': {

    'SR 1.2': {
      title: 'Device Identification and Authentication',
      text: policyText(
        'Identificare univocamente tutti gli inverter, azionamenti e driver presenti nella zona Driver prima che possano comunicare nella rete OT.',
        'Tutti gli inverter, azionamenti elettrici, servoazionamenti e drive di frequenza connessi alla rete della zona Driver.',
        [
          'Ogni inverter e azionamento deve avere indirizzo IP statico assegnato e documentato nell\'inventario della Dashboard IEC 62443.',
          'Il numero di serie e la versione firmware di ogni driver devono essere registrati e verificabili tramite protocollo di parametrizzazione vendor.',
          'I driver non registrati nell\'inventario non devono ricevere accesso alle risorse di rete della zona Driver.',
          'La sostituzione di un azionamento deve essere documentata e l\'inventario aggiornato entro 24 ore dall\'intervento.',
          'Riferimento normativo: IEC 62443-3-3 SR 1.2 — Device Identification and Authentication (FR1 — IAC).'
        ]
      )
    },

    'SR 2.1': {
      title: 'Authorization Enforcement — RBAC',
      text: policyText(
        'Limitare l\'accesso alla configurazione degli inverter e azionamenti ai soli tecnici autorizzati, proteggendo i parametri di sicurezza macchina.',
        'Tutti i parametri di configurazione degli inverter, servoazionamenti e driver della zona Driver.',
        [
          'L\'accesso ai parametri di configurazione degli inverter (velocità, rampe, correnti limite) deve richiedere password di livello 2 del dispositivo.',
          'La modifica dei parametri critici di sicurezza (corrente massima, limiti di velocità, enable hardware) deve richiedere doppia autorizzazione.',
          'Gli operatori di produzione non devono avere accesso ai parametri di configurazione avanzata dei driver.',
          'Ogni modifica ai parametri degli azionamenti deve essere registrata nel log dell\'HMI supervisore o del sistema SCADA.',
          'Riferimento normativo: IEC 62443-3-3 SR 2.1 — Authorization Enforcement (FR2 — Use Control).'
        ]
      )
    },

    'SR 3.2': {
      title: 'Malicious Code Protection',
      text: policyText(
        'Prevenire l\'introduzione di firmware non autorizzato o file di configurazione malevoli negli inverter e negli azionamenti della zona Driver.',
        'Tutti gli inverter, servoazionamenti e drive della zona Driver, inclusi i PC di parametrizzazione.',
        [
          'Il caricamento di firmware sui driver deve avvenire esclusivamente tramite tool ufficiali del vendor con firma digitale verificata.',
          'I file di parametrizzazione (es. .PAR, .PRJ, .acq specifici del vendor) devono essere verificati con hash prima del caricamento.',
          'Il software di parametrizzazione (DriveStudio, StartDrive, Safety Integrated) deve essere installato solo su PC dedicati alla zona OT.',
          'Nessun tool di accesso remoto non autorizzato deve essere installato sui PC di parametrizzazione degli azionamenti.',
          'Riferimento normativo: IEC 62443-3-3 SR 3.2 — Malicious Code Protection (FR3 — System Integrity).'
        ]
      )
    },

    'SR 3.4': {
      title: 'Software and Firmware Integrity',
      text: policyText(
        'Garantire che il firmware degli inverter e degli azionamenti non subisca alterazioni non autorizzate durante aggiornamenti o trasferimenti di parametri.',
        'Firmware e parametri di configurazione di tutti gli azionamenti e inverter della zona Driver.',
        [
          'Prima di ogni aggiornamento firmware di un driver, documentare la versione attuale e fare backup completo dei parametri.',
          'Verificare la firma digitale o il checksum del pacchetto firmware fornito dal vendor prima dell\'installazione sul dispositivo.',
          'Dopo ogni aggiornamento eseguire un test funzionale verificato dal responsabile tecnico prima di riprendere la produzione.',
          'I backup dei parametri degli azionamenti devono essere archiviati nel repository sicuro insieme ai backup PLC.',
          'Riferimento normativo: IEC 62443-3-3 SR 3.4 — Software and Firmware Integrity (FR3 — System Integrity).'
        ]
      )
    },

    'SR 5.1': {
      title: 'Network Segmentation',
      text: policyText(
        'Isolare la zona Driver dalle altre zone OT e dalla rete IT per limitare la propagazione di eventuali attacchi verso gli azionamenti.',
        'Tutti gli inverter e azionamenti in rete e lo switch dedicato della zona Driver.',
        [
          'Gli inverter e azionamenti in rete devono essere su subnet/VLAN separata e dedicata alla zona Driver.',
          'La comunicazione tra zona Driver e zona PLC deve passare attraverso uno switch/router con ACL configurate e documentate.',
          'La zona Driver non deve avere connessione diretta alla rete IT aziendale o a internet.',
          'Solo i PLC della zona PLC devono poter inviare setpoint di velocità/posizione agli azionamenti della zona Driver.',
          'Riferimento normativo: IEC 62443-3-3 SR 5.1 — Network Segmentation (FR5 — Restricted Data Flow).'
        ]
      )
    },

    'SR 5.2': {
      title: 'Zone Boundary Protection',
      text: policyText(
        'Controllare e filtrare il traffico al confine della zona Driver tramite ACL o firewall industriale per proteggere gli azionamenti da accessi non autorizzati.',
        'Il punto di interconnessione tra la zona Driver e le zone PLC/HMI, incluso lo switch industriale della zona.',
        [
          'Lo switch industriale della zona Driver deve essere configurato con ACL che permettono solo i protocolli necessari (PROFINET, EtherCAT, CANopen).',
          'Il traffico verso la zona Driver deve essere limitato agli indirizzi IP dei PLC autorizzati nella whitelist.',
          'Nessun dispositivo esterno deve poter modificare i parametri degli azionamenti senza transitare per il PLC di controllo.',
          'Il log del traffico al confine della zona Driver deve essere disponibile per analisi forensi in caso di incidente.',
          'Riferimento normativo: IEC 62443-3-3 SR 5.2 — Zone Boundary Protection (FR5 — Restricted Data Flow).'
        ]
      )
    },

    'SR 7.1': {
      title: 'DoS Protection',
      text: policyText(
        'Proteggere gli azionamenti e gli inverter da sovraccarichi di comunicazione che potrebbero causare fermi macchina o comportamenti di sicurezza imprevedibili.',
        'La rete di comunicazione degli azionamenti nella zona Driver: PROFINET, EtherCAT, Modbus TCP, CANopen.',
        [
          'Lo switch della zona Driver deve avere Storm Control abilitato per proteggere gli azionamenti da broadcast storm.',
          'Il ciclo di comunicazione PROFINET/EtherCAT deve avere watchdog configurato per rilevare la perdita di comunicazione entro 100ms.',
          'In caso di perdita della comunicazione con il PLC, gli azionamenti devono passare automaticamente in Safe State (rampa di decelerazione controllata).',
          'Il numero massimo di connessioni simultanee verso i singoli azionamenti deve essere limitato nelle regole ACL dello switch.',
          'Riferimento normativo: IEC 62443-3-3 SR 7.1 — DoS Protection (FR7 — Resource Availability).'
        ]
      )
    },

    'SR 7.8': {
      title: 'Asset Inventory',
      text: policyText(
        'Mantenere un inventario completo di tutti gli inverter e azionamenti della zona Driver per garantire tracciabilità e rilevamento di dispositivi non autorizzati.',
        'Tutti gli inverter, servoazionamenti, drive DC e azionamenti elettrici connessi alla rete della zona Driver.',
        [
          'Ogni azionamento deve essere registrato nella Dashboard IEC 62443 con: IP, MAC, vendor, modello, versione firmware, potenza nominale, numero di serie.',
          'La versione firmware di ogni driver deve essere documentata e confrontata con le security advisory del vendor.',
          'L\'inventario dei driver deve essere aggiornato dopo ogni sostituzione o intervento di manutenzione straordinaria.',
          'Lo scanner automatico della Dashboard deve verificare mensilmente la presenza di nuovi dispositivi nella subnet Driver.',
          'Riferimento normativo: IEC 62443-3-3 SR 7.8 — Asset Inventory (FR7 — Resource Availability).'
        ]
      )
    }
  }
}

module.exports = { STANDARD_POLICIES }
