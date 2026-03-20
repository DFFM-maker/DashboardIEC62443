const BUILTIN_TEMPLATES = [
  {
    id: 'tpl-packaging',
    name: 'Linea Packaging',
    description: 'Impianto di confezionamento tipico con PLC, HMI e pesatura',
    is_builtin: 1,
    zones: [
      {
        zone_name: 'PLC Zone',
        security_level: 'SL-2',
        description: 'Controller logica macchina',
        color: '#3b82f6',
        vendor_hints: ['Omron', 'Siemens', 'Rockwell', 'Schneider'],
        port_hints: [44818, 102, 502, 9600, 4840]
      },
      {
        zone_name: 'Scale Zone',
        security_level: 'SL-2',
        description: 'Controller bilance e dosatori',
        color: '#8b5cf6',
        vendor_hints: ['B&R', 'Mettler', 'Sartorius'],
        port_hints: [50000, 502]
      },
      {
        zone_name: 'HMI Zone',
        security_level: 'SL-1',
        description: 'Pannelli operatore e supervisione',
        color: '#22c55e',
        vendor_hints: ['Hakko', 'Weintek', 'Siemens', 'Rockwell'],
        port_hints: [80, 443, 4000]
      },
      {
        zone_name: 'Remote Access Zone',
        security_level: 'SL-2',
        description: 'Gateway accesso remoto',
        color: '#f97316',
        vendor_hints: ['Secomea', 'Tosibox', 'Cisco'],
        port_hints: [443, 8080, 22]
      },
      {
        zone_name: 'Infrastructure Zone',
        security_level: 'SL-2',
        description: 'Switch e infrastruttura di rete OT',
        color: '#06b6d4',
        vendor_hints: ['HPE', 'Cisco', 'Hirschmann'],
        port_hints: [22, 23, 80, 161]
      },
      {
        zone_name: 'Unclassified',
        security_level: 'SL-T',
        description: 'Device non classificati da verificare',
        color: '#6b7280',
        vendor_hints: [],
        port_hints: []
      }
    ],
    conduits: [
      { from: 'HMI Zone', to: 'PLC Zone', protocols: ['FINS', 'EtherNet/IP', 'OPC-UA'], direction: 'bidirectional' },
      { from: 'HMI Zone', to: 'Scale Zone', protocols: ['TCP/50000'], direction: 'bidirectional' },
      { from: 'Remote Access Zone', to: 'HMI Zone', protocols: ['HTTPS', 'VPN'], direction: 'inbound' },
      { from: 'Remote Access Zone', to: 'PLC Zone', protocols: ['HTTPS', 'VPN'], direction: 'inbound' }
    ]
  },
  {
    id: 'tpl-process',
    name: 'Impianto Process Control',
    description: 'Impianto process con DCS, field devices e historian',
    is_builtin: 1,
    zones: [
      { zone_name: 'Field Zone', security_level: 'SL-2', color: '#ef4444',
        description: 'Field devices e sensori', vendor_hints: ['Siemens', 'Emerson', 'Honeywell'], port_hints: [502, 20000, 102] },
      { zone_name: 'Control Zone', security_level: 'SL-2', color: '#3b82f6',
        description: 'DCS e controller', vendor_hints: ['Rockwell', 'Schneider', 'ABB'], port_hints: [44818, 4840, 102] },
      { zone_name: 'Supervisory Zone', security_level: 'SL-1', color: '#22c55e',
        description: 'SCADA e supervisione', vendor_hints: ['Wonderware', 'Ignition', 'FactoryTalk'], port_hints: [80, 443, 4840] },
      { zone_name: 'DMZ', security_level: 'SL-2', color: '#f97316',
        description: 'Zona demilitarizzata', vendor_hints: [], port_hints: [443, 22] },
      { zone_name: 'Unclassified', security_level: 'SL-T', color: '#6b7280',
        description: 'Device non classificati', vendor_hints: [], port_hints: [] }
    ],
    conduits: [
      { from: 'Supervisory Zone', to: 'Control Zone', protocols: ['OPC-UA', 'EtherNet/IP'], direction: 'bidirectional' },
      { from: 'Control Zone', to: 'Field Zone', protocols: ['Modbus TCP', 'DNP3', 'PROFINET'], direction: 'bidirectional' },
      { from: 'DMZ', to: 'Supervisory Zone', protocols: ['HTTPS'], direction: 'inbound' }
    ]
  },
  {
    id: 'tpl-discrete',
    name: 'Manifattura Discreta',
    description: 'Linea assemblaggio con robot e isole CNC',
    is_builtin: 1,
    zones: [
      { zone_name: 'Robot Zone', security_level: 'SL-2', color: '#ef4444',
        description: 'Isole robotizzate', vendor_hints: ['KUKA', 'Fanuc', 'ABB', 'Yaskawa'], port_hints: [80, 443, 7000] },
      { zone_name: 'PLC Zone', security_level: 'SL-2', color: '#3b82f6',
        description: 'Controller linea', vendor_hints: ['Siemens', 'Rockwell', 'Omron'], port_hints: [102, 44818, 9600] },
      { zone_name: 'SCADA Zone', security_level: 'SL-1', color: '#22c55e',
        description: 'Supervisione e MES', vendor_hints: [], port_hints: [80, 443, 4840] },
      { zone_name: 'Remote Access Zone', security_level: 'SL-2', color: '#f97316',
        description: 'Accesso remoto', vendor_hints: ['Secomea', 'Cisco'], port_hints: [443, 8080] },
      { zone_name: 'Unclassified', security_level: 'SL-T', color: '#6b7280',
        description: 'Device non classificati', vendor_hints: [], port_hints: [] }
    ],
    conduits: [
      { from: 'SCADA Zone', to: 'PLC Zone', protocols: ['EtherNet/IP', 'S7Comm', 'FINS'], direction: 'bidirectional' },
      { from: 'SCADA Zone', to: 'Robot Zone', protocols: ['TCP', 'OPC-UA'], direction: 'bidirectional' },
      { from: 'Remote Access Zone', to: 'SCADA Zone', protocols: ['HTTPS'], direction: 'inbound' }
    ]
  }
]

module.exports = BUILTIN_TEMPLATES
