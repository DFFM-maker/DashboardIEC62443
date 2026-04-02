const STANDARD_POLICIES = {
  'PLC-Zone': {
    'SR 1.2': {
      title: 'Identificazione e Autenticazione dei Dispositivi',
      obiettivo: 'Assicurare che tutti i dispositivi nella zona PLC siano identificati univocamente prima della comunicazione di rete.',
      ambito: 'Tutti i PLC, controllori e dispositivi di campo nella zona PLC.',
      requisiti: [
        'Ogni dispositivo deve avere un identificatore univoco (es. indirizzo MAC, numero di serie) registrato nel sistema di inventario',
        'La comunicazione iniziale deve includere lo scambio di credenziali di identificazione mutuale',
        'I dispositivi non identificati vengono bloccati finché non completano il processo di identificazione',
        'Implementare meccanismi di anti-spoofing per prevenire l\'impersonificazione di dispositivi legittimi',
        'Registrare e monitorare tutti i tentativi di identificazione falliti per rilevare attacchi di tipo brute force'
      ]
    },
    'SR 3.2': {
      title: 'Protezione da Codice Malevolo',
      obiettivo: 'Proteggere l\'ambiente PLC da malware e codice non autorizzato tramite controlli rigorosi sui vettori di infezione comuni.',
      ambito: 'Tutti i PLC, controllori e dispositivi di campo nella zona PLC.',
      requisiti: [
        'Bloccare l\'uso di porte USB esterne sui dispositivi PLC quando non strettamente necessario per le operazioni',
        'Implementare whitelisting di applicazioni per consentire solo l\'esecuzione di firmware e software autorizzati',
        'Eseguire scan antivirus su tutti i supporti di memoria esterni prima del loro utilizzo nei dispositivi PLC',
        'Monitorare i tentativi di upload/download di file sospetti tramite protocolli di programmazione (es. TFTP, FTP)',
        'Aggiornare regolarmente le firme antivirus e le regole di rilevamento comportamento anomalo'
      ]
    },
    'SR 3.4': {
      title: 'Integrità del Software',
      obiettivo: 'Garantire che firmware, file di configurazione e ricette dei PLC non subiscano alterazioni non autorizzate durante trasferimento o storage.',
      ambito: 'Tutti i PLC, controllori e dispositivi di campo nella zona PLC.',
      requisiti: [
        'Utilizzare firme digitali per verificare l\'integrità di tutti i file di firmware prima dell\'installazione sui PLC',
        'Implementare controllo di versione con hash crittografico (SHA-256) per tutti i file di configurazione e ricetta',
        'Trasferire tutti i file di programma tramite protocolli sicuri (es. SFTP, HTTPS) anziché protocolli in chiaro',
        'Mantenere un registro immutabile di tutte le modifiche autorizzate al firmware e alla configurazione',
        'Eseguire verifiche periodiche di integrità confrontando i file in esecuzione con le versioni di riferimento'
      ]
    },
    'SR 4.1': {
      title: 'Riservatezza delle Informazioni (OPC-UA)',
      obiettivo: 'Proteggere la confidenzialità dei dati di processo trasmessi via OPC-UA tra PLC e sistemi SCADA.',
      ambito: 'Tutti i canali OPC-UA attivi nella zona PLC.',
      requisiti: [
        'Le sessioni OPC-UA devono utilizzare Security Policy Basic256Sha256 con modalità SignAndEncrypt',
        'I certificati OPC-UA devono essere emessi da una CA interna e rinnovati ogni 24 mesi',
        'Le variabili di processo critiche devono essere accessibili solo a client OPC-UA autenticati',
        'Il server OPC-UA deve esporre solo i namespace strettamente necessari (principio di minima esposizione)',
        'Implementare logging dettagliato di tutte le operazioni di lettura/scrittura su variabili OPC-UA'
      ]
    },
    'SR 5.1': {
      title: 'Segmentazione di Rete',
      obiettivo: 'Isolare la zona PLC dalla rete IT e da altre zone OT tramite segmentazione fisica e logica.',
      ambito: 'Tutti i PLC, controllori e dispositivi di campo nella zona PLC, incluse le comunicazioni PROFINET/Modbus.',
      requisiti: [
        'La zona PLC deve essere isolata tramite firewall industriale o router con ACL dedicate',
        'Il traffico in ingresso deve essere limitato ai soli protocolli necessari (PROFINET, S7, Modbus TCP)',
        'Nessun accesso diretto dalla rete IT — tutto il traffico transita attraverso la DMZ industriale',
        'Gli accessi remoti ai PLC avvengono esclusivamente tramite VPN con autenticazione a due fattori',
        'Implementare VLAN separate per PLC, HMI e sistemi di supervisione quando possibile'
      ]
    },
    'SR 5.2': {
      title: 'Protezione dei Confini di Zona',
      obiettivo: 'Applicare rigorosi controlli di accesso alle interfacce tra la zona PLC e altre zone di rete.',
      ambito: 'Tutti i punti di ingresso/uscita dalla zona PLC verso reti IT, DMZ o altre zone OT.',
      requisiti: [
        'Applicare il principio \"Deny by default, allow by exception\" su tutti i firewall di confine zona',
        'Eseguire review trimestrali di tutte le regole firewall per rimuovere quelle obsolete o eccessivamente permissive',
        'Implementare deep packet inspection (DPI) per i protocolli industriali critici (PROFINET, EtherNet/IP)',
        'Separare fisicamente le reti di controllo sicurezza (Profisafe) dalle reti di controllo standard',
        'Monitorare e alertare su tutti i tentativi di connessione bloccati dai firewall di zona'
      ]
    },
    'SR 7.1': {
      title: 'Protezione da Denial of Service',
      obiettivo: 'Proteggere la zona PLC da attacchi DoS che possano compromettere la disponibilità dei sistemi di controllo.',
      ambito: 'Tutti i PLC, controllori e dispositivi di campo nella zona PLC.',
      requisiti: [
        'Configurare il firewall di zona per limitare il tasso di pacchetti per indirizzo sorgente (rate limiting)',
        'Implementare blacklisting automatico di IP che inviano traffcco anomalo o malevolo',
        'Separare fisicamente i canali di comunicazione safety (Profisafe) dai canali di controllo standard',
        'Utilizzare QoS per garantire priorità al traffico di controllo e safety critico',
        'Eseguire test periodici di resilienza DoS per verificare l\'efficacia delle contromisure'
      ]
    },
    'SR 7.3': {
      title: 'Backup del Sistema di Controllo',
      obiettivo: 'Assicurare procedure di backup affidabili e verificabili per progetti PLC, HMI e configurazioni di rete.',
      ambito: 'Tutti i progetti PLC, file HMI e configurazioni di rete nella zona PLC.',
      requisiti: [
        'Eseguire backup automatizzati giornalieri di tutti i progetti PLC e configurazioni HMI',
        'Verificare l\'integrità dei backup tramite ripristino di prova su sistemi di test almeno mensile',
        'Conservare copie di backup off-site o in cloud sicuro per protezione da eventi fisici',
        'Mantenere almeno 3 versioni storiche di ogni backup per permettere rollback in caso di corruzione',
        'Documentare e testare le procedure di ripristino di emergenza (Disaster Recovery) semestralmente'
      ]
    },
    'SR 7.8': {
      title: 'Inventario delle Risorse',
      obiettivo: 'Mantenere un inventario accurato e aggiornato di tutti gli asset nella zona PLC per supportare il risk management.',
      ambito: 'Tutti i dispositivi hardware, software e componenti di rete nella zona PLC.',
      requisiti: [
        'Scoperta automatica di tutti i dispositivi connessi alla zona PLC almeno giornalmente',
        'Registrare per ogni asset: tipo, modello, versione firmware, posizione fisica, funzione di controllo',
        'Associare ogni asset ai relativi CVEs note e tenere traccia dello stato di patch applicabili',
        'Implementare meccanismi di segnalazione per dispositivi non autorizzati o sconosciuti rilevati in rete',
        'Eseguire riconciliazione mensionale tra inventario scoperto e inventario dichiarato dagli amministratori'
      ]
    }
  },
  'HMI-Zone': {
    'SR 1.2': {
      title: 'Identificazione e Autenticazione dei Dispositivi HMI',
      obiettivo: 'Assicurare che tutti i dispositivi HMI siano identificati e autenticati prima di poter accedere alla rete di controllo.',
      ambito: 'Tutti gli HMI, workstation di supervisione e terminali operator nella zona HMI.',
      requisiti: [
        'Implementare autenticazione basata su certificati per tutti gli HMI che si connettono alla rete industriale',
        'Utilizzare soluzioni di single sign-on (SSO) integrate con directory aziendale per accessi HMI',
        'Bloccare l\'accesso HMI da dispositivi non riconosciuti o non gestiti dal dipartimento IT',
        'Registrare e monitorare tutti gli accessi HMI falliti per rilevare tentativi di intrusione',
        'Richiedere cambio password periodico (ogni 90 giorni) per tutti gli account HMI locali'
      ]
    },
    'SR 1.3': {
      title: 'Gestione degli Account',
      obiettivo: 'Gestire rigorosamente gli account utente sui sistemi HMI per prevenire accessi non autorizzati.',
      ambito: 'Tutti gli HMI, workstation di supervisione e terminali operator nella zona HMI.',
      requisiti: [
        'Implementare provisioning e deprovisioning automatico degli account HMI tramite integrazione con HR/Active Directory',
        'Eseguire review semestrali di tutti gli account HMI per rimuovere quelli obsoleti o non più necessari',
        'Applicare principio del minimo privilegio: gli operatori hanno accesso solo alle funzioni necessarie al loro ruolo',
        'Monitorare e alertare su tentativi di escalation di privilegi su sistemi HMI',
        'Disabilitare account dopo 5 tentativi di login falliti consecutivi e richiedere intervento amministratore per riattivazione'
      ]
    },
    'SR 1.7': {
      title: 'Forza delle Password',
      obiettivo: 'Implementare policy robuste per le password su tutti i sistemi HMI per resistere ad attacchi di tipo brute force.',
      ambito: 'Tutti gli HMI, workstation di supervisione e terminali operator nella zona HMI.',
      requisiti: [
        'Richiedere password di almeno 12 caratteri con complessità (maiuscole, minuscole, numeri, simboli)',
        'Abilitare autenticazione a due fattori (MFA) per tutti gli accessi HMI remoti e privilegiati',
        'Vietare il riuso delle ultime 5 password utilizzate per ogni account',
        'Implementare blocco account dopo 5 tentativi di login falliti entro 15 minuti',
        'Eseguire scan periodico per identificare password deboli, comuni o compromesse negli account HMI'
      ]
    },
    'SR 2.1': {
      title: 'Applicazione dell\'Autorizzazione',
      obiettivo: 'Applicare controlli di autorizzazione basati sui ruoli (RBAC) su tutti i sistemi HMI.',
      ambito: 'Tutti gli HMI, workstation di supervisione e terminali operator nella zona HMI.',
      requisiti: [
        'Definire chiaramente ruoli e responsabilità (es. Operatore, Supervisore, Manutentore, Amministratore)',
        'Mappare ogni ruolo ai permessi minimi necessari per eseguire le proprie funzioni lavorative',
        'Implementare controlli di autorizzazione a livello di funzione/screen negli applicativi HMI',
        'Eseguire review trimestrali dei permessi ruolo per assicurare corrispondenza con responsabilità attuali',
        'Loggare tutti i tentativi di accesso a funzioni non autorizzate per audit e investigation'
      ]
    },
    'SR 2.8': {
      title: 'Eventi Auditabili (Log)',
      obiettivo: 'Assicurare che tutti gli eventi di sicurezza rilevanti sui sistemi HMI siano registrati in modo auditabile.',
      ambito: 'Tutti gli HMI, workstation di supervisione e terminali operator nella zona HMI.',
      requisiti: [
        'Loggare tutti gli accessi riusciti e falliti, inclusi timestamp, indirizzo IP sorgente e account utilizzato',
        'Registrare tutte le modifiche di configurazione critiche effettuate tramite interfaccia HMI',
        'Monitorare e loggare l\'uso di privilegi elevati o funzioni amministrative sui sistemi HMI',
        'Conservare i log di sicurezza per almeno 12 mesi in formato immodificabile (WORM)',
        'Implementare alert in tempo reale per eventi di sicurezza critici (es. brute force, accessi fuori orario)'
      ]
    },
    'SR 3.2': {
      title: 'Protezione da Codice Malevolo (HMI)',
      obiettivo: 'Proteggere gli sistemi HMI da malware, ransomware e codice non autorizzato.',
      ambito: 'Tutti gli HMI, workstation di supervisione e terminali operator nella zona HMI.',
      requisiti: [
        'Mantenere aggiornato il sistema operativo e tutti gli applicativi HMI con le ultime patch di sicurezza',
        'Utilizzare soluzioni antivirus/antimalware di grado enterprise con aggiornamenti in tempo reale',
        'Bloccare l\'esecuzione di script e macro non firmati negli applicativi HMI (es. VBA, PowerShell)',
        'Limitare l\'uso di dispositivi USB esterni sulle workstation HMI quando non strettamente necessario',
        'Eseguire backup giornalieri delle configurazioni HMI critiche per ripristino rapido in caso di infezione'
      ]
    },
    'SR 4.1': {
      title: 'Riservatezza delle Informazioni (HMI)',
      obiettivo: 'Proteggere la confidenzialità dei dati di processo e configurazione visualizzati/modificati tramite HMI.',
      ambito: 'Tutti gli HMI, workstation di supervisione e terminali operator nella zona HMI.',
      requisiti: [
        'Cifrare tutte le comunicazioni HMI-PLC e HMI-SCADA utilizzando TLS 1.2 o superiore',
        'Implementare timeout di inattività automatico (max 15 minuti) su tutti i terminali HMI',
        'Mascherare o censurare i dati di processo sensibili negli screenshot e nelle funzioni di stampa HMI',
        'Separare le reti HMI da quelle di ufficio IT tramite firewall o VLAN dedicate',
        'Eseguire penetration test periodici sulle interfacce HMI per identificare vulnerabilità di divulgazione informazioni'
      ]
    },
    'SR 5.1': {
      title: 'Segmentazione di Rete (HMI)',
      obiettivo: 'Isolare la zona HMI dalla rete IT e controllare rigorosamente i flussi di dati verso la zona PLC.',
      ambito: 'Tutti gli HMI, workstation di supervisione e terminali operator nella zona HMI.',
      requisiti: [
        'La zona HMI deve essere isolata tramite firewall industriale o VLAN dedicate dallo switch managed',
        'Consentire il traffico HMI-PLC solo sui protocolli e porte strettamente necessari (es. Modbus TCP, EtherNet/IP)',
        'Bloccare tutto il traffico non necessario dalla rete IT verso la zona HMI (es. navigazione web, posta elettronica)',
        'Implementare DMZ intermediaria per sistemi che richiedono accesso sia da IT che da OT (es. storici, MES)',
        'Loggare e monitorare tutto il traffico interdirezionale tra zona HMI e altre zone di rete'
      ]
    },
    'SR 5.2': {
      title: 'Protezione dei Confini di Zona (HMI)',
      obiettivo: 'Applicare controlli rigorosi alle interfacce tra la zona HMI e altre zone di rete.',
      ambito: 'Tutti i punti di ingresso/uscita dalla zona HMI verso reti IT, zona PLC o DMZ.',
      requisiti: [
        'Applicare regole firewall stateful con policy \"Deny by default\" su tutti i confini zona HMI',
        'Eseguire inspection profonda dei pacchetti (DPI) per rilevare tunneling o protocolli non autorizzati',
        'Separare fisicamente le reti HMI di ufficio da quelle di fabbrica quando possibile',
        'Implementare authenticaion a due fattori per accessi remoti alla zona HMI',
        'Monitorare le connessioni VPN remote alla zona HMI per rilevare utilizzi non autorizzati o sospetti'
      ]
    },
    'SR 6.2': {
      title: 'Monitoraggio Continuo (HMI)',
      obiettivo: 'Implementare monitoraggio continuo del traffico di rete nella zona HMI per rilevare anomalie e potenziali attacchi.',
      ambito: 'Tutti gli HMI, workstation di supervisione e terminali operator nella zona HMI.',
      requisiti: [
        'Configurare port mirroring (SPAN) dallo switch managed verso sonde IDS passive per il monitoraggio HMI',
        'Implementare regole di correlazione per rilevare schemi di attacco comuni (es. brute force, scanning porte)',
        'Conservare i pacchetti catturati per almeno 30 giorni per analisi forense post-evento',
        'Integrare gli alert IDS con il sistema di gestione eventi di sicurezza (SIEM) centrale',
        'Eseguire tuning mensile delle regole IDS per ridurre falsi positivi mantenendo alta capacità di rilevamento'
      ]
    },
    'SR 7.8': {
      title: 'Inventario delle Risorse (HMI)',
      obiettivo: 'Mantenere inventario accurato di tutti gli asset hardware e software nella zona HMI.',
      ambito: 'Tutti gli HMI, workstation di supervisione, terminali operator e relativa infrastruttura di rete.',
      requisiti: [
        'Scoperta automatica di tutti gli dispositivi HMI e workstation connessi alla zona di rete',
        'Registrare per ogni asset HMI: hostname, indirizzo IP, MAC address, versione SO, applicativi installati',
        'Tenere traccia delle versioni di software HMI, plugin e componenti terzi parti installati',
        'Associare ogni vulnerabilità nota (CVE) agli asset HMI interessati e monitorare lo stato di patch',
        'Eseguire verifiche trimestrali di conformità confrontando inventario reale con quello dichiarato in CMDB'
      ]
    }
  },
  'Router-Zone': {
    'SR 1.3': {
      title: 'Gestione degli Account di Rete',
      obiettivo: 'Gestire rigorosamente gli account amministrativi sui dispositivi di rete (router, switch, firewall).',
      ambito: 'Tutti i router, switch managed, firewall industriali e punti di accesso wireless nella zona Router.',
      requisiti: [
        'Disabilitare tutti gli account di default factory sui dispositivi di rete e crearne di nuovi con credenziali uniche',
        'Implementare autenticazione esterna (RADIUS/TACACS+) con integrazione Azure AD per accessi amministrativi',
        'Applicare principio del minimo privilegio sugli account di rete: distinguere tra ruolo di monitoring e configurazione',
        'Loggare tutte le sessioni amministrative sui dispositivi di rete con comando eseguito e timestamp',
        'Eseguire change management formale per tutte le modifiche di configurazione su dispositivi di rete critici'
      ]
    },
    'SR 1.7': {
      title: 'Forza delle Password di Rete',
      obiettivo: 'Assicurare che tutte le password sui dispositivi di rete rispettino policy di complessità e rotazione.',
      ambito: 'Tutti i router, switch managed, firewall industriali e punti di accesso wireless nella zona Router.',
      requisiti: [
        'Richiedere password di almeno 14 caratteri per account amministrativi su dispositivi di rete',
        'Abilitare autenticazione a due fattori per tutti gli accessi amministrativi remoti ai dispositivi di rete',
        'Vietare password comuni, dictionary-based o derivanti da informazioni aziendali note',
        'Implementare rotazione obbligatoria delle password ogni 60 giorni per account privilegiati di rete',
        'Loggare e alertare su tutti i tentativi di modifica forzata o bypass delle policy di password sui dispositivi di rete'
      ]
    },
    'SR 2.8': {
      title: 'Logging e Auditing di Rete',
      obiettivo: 'Assicurare logging completo e auditabile di tutti gli eventi di sicurezza sui dispositivi di rete.',
      ambito: 'Tutti i router, switch managed, firewall industriali e punti di accesso wireless nella zona Router.',
      requisiti: [
        'Abilitare logging di tutti i pacchetti scartati (drop logging) sui firewall di zona con ragione dello scarto',
        'Inviare tutti i log di rete a un server syslog centrale o sistema SIEM per conservazione e analisi',
        'Loggare tutte le modifiche di configurazione effettuate tramite CLI, SNMP o interfaccia web sui dispositivi di rete',
        'Implementare integrità dei log tramite firma crittografica o invio a sistema di log write-once-read-many',
        'Eseguire review giornaliera dei log di rete per rilevare schemi di attacco, scansione porte o tentativi di intrusione'
      ]
    },
    'SR 4.3': {
      title: 'Uso della Crittografia (Router)',
      obiettivo: 'Utilizzare crittografia forte per proteggere le comunicazioni di rete sensibili in transito attraverso i dispositivi di zona.',
      ambito: 'Tutti i router, switch managed, firewall industriali e punti di accesso wireless nella zona Router.',
      requisiti: [
        'Utilizzare esclusivamente VPN IPSec o SSL/TLS con almeno AES-256 per tutte le connessioni remote ai dispositivi di rete',
        'Implementare TLS 1.2 o superiore con perfect forward secrecy per tutte le interfacce web di gestione dispositivi',
        'Configurare suite di cifratura forte che escluda algoritmi deboli (RC4, DES, 3DES) e modalità non authenticate',
        'Gestire centralmente certificati e chiavi tramite PKI interna con rotazione automatica ogni 90 giorni',
        'Eseguire test periodici di forza crittografica (es. tentativo di decrittazione forzata) sulle implementazioni VPN'
      ]
    },
    'SR 5.1': {
      title: 'Segmentazione di Rete di Zona',
      obiettivo: 'Definire e implementare rigorosa segmentazione di rete a livello di zona usando i dispositivi di zona stessa.',
      ambito: 'Tutti i router, switch managed, firewall industriali e relativa infrastruttura di zona nella zona Router.',
      requisiti: [
        'Creare VLAN isolate per ciascuna zona identificata (PLC-Zone, HMI-Zone, IT-Zone, DMZ-Zone) usando switch managed',
        'Implementare ACL dettagliate sui router di zona per controllare precisamente quali flussi sono autorizzati tra zone',
        'Utilizzare firewall di zona per applicare policy di stato sui confini tra zone (es. PLC-Zone <-> HMI-Zone)',
        'Separare fisicamente o logicamente le reti di controllo sicurezza (Profisafe/CIP Safety) dalle reti di controllo standard',
        'Documentare e mantenere aggiornato un diagramma di topologia di zona che mostri tutte le VLAN e router interdirezionali'
      ]
    },
    'SR 5.2': {
      title: 'Protezione dei Confini di Zona di Rete',
      obiettivo: 'Applicare i controlli di sicurezza più rigorosi proprio sui punti di interconnessione tra zone di rete.',
      ambito: 'Tutti i punti di interconnessione/router che collegano diverse zone di rete (PLC, HMI, IT, DMZ).',
      requisiti: [
        'Applicare policy firewall stateful con ispezione approfondita su tutte le interfacce interzona',
        'Implementare deep packet inspection (DPI) con firme protocollo-specifiche per rilevare anomalie nei protocolli industriali',
        'Separare fisicamente i dispositivi di confine zona in rack o armadi dedicati quando possibile',
        'Utilizzare tecniche di network cloaking per nascondere la topologia interna di zona dagli scanner esterni',
        'Eseguire penetration test regolari focalizzati esclusivamente sui punti di interconnessione tra zone di rete'
      ]
    },
    'SR 6.2': {
      title: 'Monitoraggio Continuo di Rete',
      obiettivo: 'Implementare monitoraggio continuo del traffico interzona per rilevare spostamenti laterali e comunicazioni non autorizzate.',
      ambito: 'Tutti i router, switch managed, firewall industriali nella zona Router.',
      requisiti: [
        'Configurare port mirroring (SPAN) o sonde TAP su tutte le interfacce interzona per acquisizione traffico completa',
        'Implementare regole di comportamento per rilevare comunicazioni non protocollo (es. tunneling, porte non standard)',
        'Correlare eventi da múltiples fonti (IDS, firewall, auth) per ridurre falsi positivi e migliorare accuratezza detection',
        'Conservare i dati di monitoraggio di rete per almeno 90 giorni per supportare indagini forensi complesse',
        'Integrare il sistema di monitoraggio di rete con piattaforme di threat intelligence per indicatori di compromissione aggiornati'
      ]
    },
    'SR 7.1': {
      title: 'Protezione DoS a Livello di Zona',
      obiettivo: 'Proteggere l\'infrastruttura di zona da attacchi DoS che possano isolare o degradare le comunicazioni interzona.',
      ambito: 'Tutti i router, switch managed, firewall industriali nella zona Router.',
      requisiti: [
        'Implementare rate limiting basato su sorgente e destinazione su tutte le interfacce interzona dei dispositivi di rete',
        'Utilizzare tecniche di SYN cookies e connection limiting per mitigare attacchi SYN flood sui servizi di rete',
        'Separare fisicamente i canali di comunicazione di banda critica (es. Profisafe) usando VLAN o interfacce dedicate',
        'Implementare blackholing automatico di traiettorie note di attacco DoS tramite routing policy o BGP',
        'Eseguire stress test periodici della capacità di banda interzona per verificare resilienza contro picchi di traffico'
      ]
    },
    'SR 7.8': {
      title: 'Inventario delle Risorse di Rete',
      obiettivo: 'Mantenere inventario preciso e aggiornato di tutta l\'infrastruttura di rete nella zona Router.',
      ambito: 'Tutti i router, switch managed, firewall industriali, punti di accesso wireless e relativa infrastruttura di zona.',
      requisiti: [
        'Scoperta automatica di tutti i dispositivi di livello 2 e 3 connessi alla zona di rete almeno ogni ora',
        'Registrare per ogni dispositivo: tipo, modello, versione firmware, posizione fisica, funzione di rete (router, switch, firewall)',
        'Tenere traccia delle modifiche di configurazione critiche effettuate tramite rispetto a versione di riferimento conosciuta',
        'Associare ogni porta fisica e logica ai dispositivi endpoint collegati per facilitare troubleshooting e segnalazione anomalie',
        'Eseguire verifiche di conformità configurazionale mensile rispetto a baseline di sicurezza approvata'
      ]
    }
  },
  'Driver-Zone': {
    'SR 1.2': {
      title: 'Identificazione e Autenticazione dei Dispositivi di Azionamento',
      obiettivo: 'Assicurare che tutti i dispositivi di azionamento (inverter, drive, motori intelligenti) siano identificati prima della comunicazione di rete.',
      ambito: 'Tutti gli inverter, drive, motori connessi in rete e relativi controllori nella zona Driver.',
      requisiti: [
        'Implementare meccanismi di binding fisico-logico che associano identificatore di dispositivo a posizione fisica nell\'impianto',
        'Utilizzare protocolli di comunicazione che includano autenticazione mutuale nello scambio iniziale (es. EtherNet/IP con CIP Security)',
        'Bloccare la comunicazione di rete con dispositivi di azionamento che non presentano credenziali di identificazione valide',
        'Mantenere un database centrale di tutti gli identificatori di dispositivo di azionamento autorizzati nell\'impianto',
        'Eseguire verifiche quotidiane di corrispondenza tra inventario logico di dispositivi e quelli fisicamente presenti'
      ]
    },
    'SR 2.1': {
      title: 'Autorizzazione nei Sistemi di Azionamento',
      obiettivo: 'Applicare controlli di autorizzazione appropriati sui dispositivi di azionamento connessi in rete.',
      ambito: 'Tutti gli inverter, drive, motori connessi in rete e relativi controllori nella zona Driver.',
      requisiti: [
        'Definire chiaramente quali funzioni possono essere controllate tramite rete (es. avvio/arresto, cambio velocità) e quali richiedono accesso fisico',
        'Implementare controlli di autorizzazione a livello di funzione nei protocolli di comunicazione dei drive (es. CIP Object access controls)',
        'Loggare tutte le modifiche di parametri critiche effettuate tramite rete sui dispositivi di azionamento',
        'Separare funzioni di controllo standard da funzioni di manutenzione/configurazione che richiedono privilegi elevati',
        'Implementare timeout automatico e ritorno a stato sicuro per comandi di rete non confermati entro timeframe definito'
      ]
    },
    'SR 3.2': {
      title: 'Protezione da Codice Malevolo (Driver)',
      obiettivo: 'Proteggere l\'ambiente dei dispositivi di azionamento da malware, trojan e codice non autorizzato.',
      ambito: 'Tutti gli inverter, drive, motori connessi in rete e relativi controllori nella zona Driver.',
      requisiti: [
        'Bloccare l\'uso di porte di servizio (es. USB, RS-232) sui dispositivi di azionamento quando non necessario per operazioni normali',
        'Implementare whitelisting di firmware per consentire solo l\'esecuzione di versioni validate dal costruttore',
        'Eseguire scan di integrità su tutti i dispositivi di azionamento nuovi o sostituiti prima del loro inserimento in rete',
        'Monitorare i tentativi di flashaggio non autorizzato o sostituzione di firmware tramite porte di servizio',
        'Mantenere scorte di firmware di riferimento noto-buono per ripristino rapido in caso di corruzione o infezione'
      ]
    },
    'SR 3.4': {
      title: 'Integrità del Software di Azionamento',
      obiettivo: 'Garantire che firmware e parametri di configurazione dei dispositivi di azionamento non subiscano alterazioni non autorizzate.',
      ambito: 'Tutti gli inverter, drive, motori connessi in rete e relativi controllori nella zona Driver.',
      requisiti: [
        'Utilizzare firme digitali costruttrici per verificare l\'autenticità di tutti i file di firmware prima del caricamento sui drive',
        'Implementare controllo versione con hash crittografico per tutti i file di parametro e configurazione dei drive',
        'Trasferire tutti i file di firmware e configurazione tramite canali sicuri e verificabili (es. SFTP con verifica hash)',
        'Mantenere un registro di tutte le modifiche autorizzate ai parametri di controllo con timestamp e responsabile',
        'Eseguire controlli di integrità automatici all\'avvio confrontando il firmware in esecuzione con la versione di riferimento'
      ]
    },
    'SR 5.1': {
      title: 'Segmentazione di Rete per Azionamento',
      obiettivo: 'Isolare la zona Driver dalla rete IT e controllare rigorosamente quali dispositivi possono comunicare con gli azionamenti.',
      ambito: 'Tutti gli inverter, drive, motori connessi in rete e relativi controllori nella zona Driver.',
      requisiti: [
        'La zona Driver deve essere isolata tramite VLAN dedicata o fisicamente separata dallo switch managed di macchina',
        'Consentire la comunicazione di rete solo verso controllori di logica (PLC) e sistemi di supervisione strettamente necessari',
        'Bloccare tutto il traffico non necessario dalla rete IT verso la zona Driver (es. browsing web, posta elettronica)',
        'Implementare comunicazione point-to-point quando possibile invece di broadcast o multicast sulle reti di azionamento',
        'Loggare e monitorare tutti i tentativi di connessione falliti da fonti non autorizzate verso dispositivi di azionamento'
      ]
    },
    'SR 5.2': {
      title: 'Protezione dei Confini di Zona per Azionamento',
      obiettivo: 'Applicare controlli di accesso rigorosi alle interfacce tra la zona Driver e altre zone di rete.',
      ambito: 'Tutti i punti di ingresso/uscita dalla zona Driver verso reti IT, zona PLC o sistemi di supervisione.',
      requisiti: [
        'Applicare regole firewall stateful con policy \"Deny by default\" su tutte le interfacce zona Driver',
        'Implementare port-based authentication dove possibile per verificare l\'identità di dispositivi direttamente connessi',
        'Separare fisicamente le reti di azionamento critiche da quelle standard quando possibile (es. drive di sicurezza vs standard)',
        'Utilizzare tecniche di port security per limitare quanti dispositivi possono connettersi a ciascuna porta di switch',
        'Eseguire verifiche trimestrali di tutte le regole firewall zona Driver per assicurare corrispondenza con topologia di rete attuale'
      ]
    },
    'SR 7.1': {
      title: 'Protezione DoS per Sistemi di Azionamento',
      obiettivo: 'Proteggere i dispositivi di azionamento da attacchi DoS che possano causare arresto non sicuro o perdita di controllo.',
      ambito: 'Tutti gli inverter, drive, motori connessi in rete e relativi controllori nella zona Driver.',
      requisiti: [
        'Implementare rate limiting di pacchetti per sorgente sulle interfacce di comunicazione dei dispositivi di azionamento',
        'Utilizzare QoS per garantire priorità assoluta al traffico di controllo e sicurezza sui dispositivi di azionamento',
        'Separare fisicamente i canali di comunicazione safety (se presenti) dai canali di controllo standard sui drive',
        'Monitorare l\'utilizzo di banda di comunicazione sui dispositivi di azionamento per rilevare usi anomali o non previsto',
        'Eseguire test di resilienza DoS simulando perdita di comunicazione di rete per verificare comportamento di fail-safe dei drive'
      ]
    },
    'SR 7.8': {
      title: 'Inventario delle Risorse di Azionamento',
      obiettivo: 'Mantenere inventario accurato di tutti i dispositivi di azionamento connessi in rete per supportare il change management.',
      ambito: 'Tutti gli inverter, drive, motori connessi in rete e relativi controllori nella zona Driver.',
      requisiti: [
        'Scoperta automatica di tutti i dispositivi di azionamento connessi in rete almeno ogni 6 ore tramite protocolli di discovery standard',
        'Registrare per ogni asset: tipo, modello, potenza nominale, versione firmware, funzione di controllo (velocità, coppia, posizione)',
        'Tenere traccia dello stato operativo riportato dai dispositivi (es. in marcia, in fault, in standby) per correlazione con eventi di rete',
        'Associare ogni punto di connessione di rete ai relativi dispositivi endpoint per facilitare diagnosi di problemi di comunicazione',
        'Eseguire verifiche di corrispondenza mensile tra inventario logico di dispositivi azionamento e quelli fisicamente installati'
      ]
    }
  }
};

module.exports = { STANDARD_POLICIES };