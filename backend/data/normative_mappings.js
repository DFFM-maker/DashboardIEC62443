/**
 * Mapping normativo: IEC 62443-3-3 -> NIS2 / CRA / Machinery Reg
 * 
 * Questo file definisce i riferimenti normativi per ogni categoria di controllo.
 * I mapping specifici sono basati sul codice SR/RE del controllo.
 */

export const NORMATIVE_REFERENCES = {
  IEC62443: {
    '2-1': 'Establishing an IACS security program',
    '2-4': 'Requirements for IACS service providers', 
    '3-2': 'Security risk assessment for system design',
    '3-3': 'System security requirements and security levels',
    '4-1': 'Product security development life-cycle requirements',
    '4-2': 'Technical security requirements for IACS components',
  },
  NIS2: {
    art18: {
      title: 'Cybersecurity risk management measures',
      items: [
        { id: '1.1', title: 'Policies on risk analysis and information system security' },
        { id: '1.2', title: 'Incident handling' },
        { id: '1.3', title: 'Business continuity (backup, disaster recovery)' },
        { id: '1.4', title: 'Supply chain security' },
        { id: '1.5', title: 'Security in network and info systems acquisition' },
        { id: '1.6', title: 'Policies to assess the effectiveness of risk management' },
        { id: '1.7', title: 'Basic cyber hygiene practices and training' },
        { id: '1.8', title: 'Policies regarding the use of cryptography' },
        { id: '1.9', title: 'Human resources security, access policies' },
        { id: '1.10', title: 'Use of multi-factor authentication' }
      ]
    }
  },
  CRA: {
    annexI: {
      title: 'Essential cybersecurity requirements',
      items: [
        { id: '1', title: 'Security capabilities of products with digital elements' },
        { id: '2', title: 'Vulnerability handling' },
        { id: '3', title: 'Lifecycle process' },
        { id: '4', title: 'Documentation & Reporting' }
      ]
    }
  },
  MachineryReg: {
    req_1_1_9: 'Protection against corruption — cybersecurity',
    req_1_2_1: 'Safety and reliability of control systems'
  }
}

/**
 * Mapping controlli IEC -> NIS2 / CRA
 * { SR_CODE: { nis2: ['1.x'], cra: ['x'] } }
 */
export const COMPLIANCE_MAPPING = {
  // IAC (Identification & Auth) -> NIS2 1.10 (MFA), 1.9 (Access)
  'SR 1.1': { nis2: ['1.9'], cra: ['1'] },
  'SR 1.2': { nis2: ['1.9'], cra: ['1'] },
  'SR 1.3': { nis2: ['1.10'], cra: ['1'] },
  
  // UC (Use Control) -> NIS2 1.9
  'SR 2.1': { nis2: ['1.9'], cra: ['1'] },
  
  // SI (System Integrity) -> NIS2 1.2, 1.5, CRA 1
  'SR 3.1': { nis2: ['1.2'], cra: ['1'] },
  
  // DC (Data Confidentiality) -> NIS2 1.8 (Crypto)
  'SR 4.1': { nis2: ['1.8'], cra: ['1'] },
  
  // RDF (Restricted Data Flow) -> Machinery 1.1.9, NIS2 1.1
  'SR 5.1': { nis2: ['1.1'], cra: ['1'], machinery: ['1.1.9'] },
  
  // TRE (Timely Response) -> NIS2 1.2
  'SR 6.1': { nis2: ['1.2'], cra: ['2'] },
}
