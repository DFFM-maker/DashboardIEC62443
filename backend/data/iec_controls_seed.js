/**
 * IEC 62443-3-3 Security Requirements (SR) and Requirement Enhancements (RE)
 *
 * Categorie:
 *   IAC - Identification and Authentication Control (SR 1.x)
 *   UC  - Use Control (SR 2.x)
 *   SI  - System Integrity (SR 3.x)
 *   DC  - Data Confidentiality (SR 4.x)
 *   RDF - Restricted Data Flow (SR 5.x)
 *   TRE - Timely Response to Events (SR 6.x)
 *   RA  - Resource Availability (SR 7.x)
 *
 * Colonne SL (Security Level):
 *   sl1=1 significa che il controllo è richiesto da SL1
 *   sl2=1 significa che il controllo è richiesto da SL2
 *   sl3=1 significa che il controllo è richiesto da SL3
 *   sl4=1 significa che il controllo è richiesto da SL4
 */

const { v4: uuidv4 } = require('uuid')

const IEC_CONTROLS = [
  // ================================================================
  // SR 1 — IDENTIFICATION AND AUTHENTICATION CONTROL (IAC)
  // ================================================================
  {
    sr_code: 'SR 1.1', re_code: null, category: 'IAC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Human User Identification and Authentication',
    description: 'The control system shall provide the capability to identify and authenticate all human users on all interfaces. This capability shall enforce such identification and authentication on all human users before allowing any other actions on the control system.'
  },
  {
    sr_code: 'SR 1.1', re_code: 'RE(1)', category: 'IAC',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Human User Identification and Authentication — Unique identification and authentication',
    description: 'The control system shall provide the capability to uniquely identify and authenticate all human users. This capability shall enforce such identification and authentication on all human users before allowing any other actions on the control system.'
  },
  {
    sr_code: 'SR 1.1', re_code: 'RE(2)', category: 'IAC',
    sl1: 0, sl2: 0, sl3: 0, sl4: 1,
    title: 'Human User Identification and Authentication — Multifactor authentication for untrusted networks',
    description: 'The control system shall provide the capability to require multifactor authentication for all human user accounts accessing the control system via untrusted networks.'
  },
  {
    sr_code: 'SR 1.2', re_code: null, category: 'IAC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Software Process and Device Identification and Authentication',
    description: 'The control system shall provide the capability to identify and authenticate all software processes and devices. This capability shall enforce such identification and authentication on all software processes and devices before allowing any other actions on the control system.'
  },
  {
    sr_code: 'SR 1.2', re_code: 'RE(1)', category: 'IAC',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Software Process and Device Identification and Authentication — Unique identification and authentication',
    description: 'The control system shall provide the capability to uniquely identify and authenticate all software processes and devices. This includes identity management for devices using PKI certificates or equivalent.'
  },
  {
    sr_code: 'SR 1.3', re_code: null, category: 'IAC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Account Management',
    description: 'The control system shall provide the capability to manage all accounts by the following account management activities: creating, activating, modifying, disabling, and removing accounts.'
  },
  {
    sr_code: 'SR 1.3', re_code: 'RE(1)', category: 'IAC',
    sl1: 0, sl2: 1, sl3: 1, sl4: 1,
    title: 'Account Management — Unified account management',
    description: 'The control system shall provide the capability to centrally manage all accounts, including those stored by the control system.'
  },
  {
    sr_code: 'SR 1.4', re_code: null, category: 'IAC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Identifier Management',
    description: 'The control system shall provide the capability to support the management of identifiers by user, group, role, or control system interface. The control system shall require that the identifiers are unique within the control system.'
  },
  {
    sr_code: 'SR 1.5', re_code: null, category: 'IAC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Authenticator Management',
    description: 'The control system shall provide the capability to manage authenticators including: a) initial authenticator content, b) minimum and maximum lifetime restrictions for authenticators, c) reuse conditions for authenticators, d) protection of authenticators against unauthorized disclosure and modification.'
  },
  {
    sr_code: 'SR 1.5', re_code: 'RE(1)', category: 'IAC',
    sl1: 0, sl2: 1, sl3: 1, sl4: 1,
    title: 'Authenticator Management — Hardware security tokens',
    description: 'The control system shall provide the capability to support the use of hardware security tokens as authenticators.'
  },
  {
    sr_code: 'SR 1.6', re_code: null, category: 'IAC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Wireless Access Management',
    description: 'The control system shall provide the capability to identify and authenticate all users (human, software processes and devices) engaged in wireless communication. The control system shall enforce authentication prior to allowing wireless access.'
  },
  {
    sr_code: 'SR 1.6', re_code: 'RE(1)', category: 'IAC',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Wireless Access Management — Uniquely identified and authenticated',
    description: 'The control system shall provide the capability to uniquely identify and authenticate all users (human, software processes and devices) engaged in wireless communication.'
  },
  {
    sr_code: 'SR 1.7', re_code: null, category: 'IAC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Strength of Password-Based Authentication',
    description: 'The control system shall provide the capability to enforce configurable password strength requirements including minimum password length, password complexity, and password lifetime restrictions.'
  },
  {
    sr_code: 'SR 1.7', re_code: 'RE(1)', category: 'IAC',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Strength of Password-Based Authentication — Support for any composition rules',
    description: 'The control system shall support the configuration of any composition rules for passwords including character types, repetition patterns, and dictionary checks.'
  },
  {
    sr_code: 'SR 1.8', re_code: null, category: 'IAC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Public Key Infrastructure Certificates',
    description: 'The control system shall provide the capability to operate as a PKI subscriber and to support the ability to set and to change the PKI Certification Authority.'
  },
  {
    sr_code: 'SR 1.9', re_code: null, category: 'IAC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Strength of Public Key Authentication',
    description: 'The control system shall provide the capability to require that all public key-based authentication methods use cryptographic methods that are approved by the control system owner.'
  },
  {
    sr_code: 'SR 1.10', re_code: null, category: 'IAC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Authenticator Feedback',
    description: 'The control system shall provide the capability to obscure feedback of authentication information during the authentication process.'
  },
  {
    sr_code: 'SR 1.11', re_code: null, category: 'IAC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Unsuccessful Login Attempts',
    description: 'The control system shall provide the capability to enforce a limit of consecutive failed login attempts for a time period defined by the asset owner. The control system shall provide the capability to lock or disable the account for a time period defined by the asset owner.'
  },
  {
    sr_code: 'SR 1.12', re_code: null, category: 'IAC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'System Use Notification',
    description: 'The control system shall provide the capability to display a system use notification message before authenticating. The asset owner shall determine the content of the notification message.'
  },
  {
    sr_code: 'SR 1.13', re_code: null, category: 'IAC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Access via Untrusted Networks',
    description: 'The control system shall provide the capability to identify and authenticate any access through untrusted networks. The control system shall enforce authentication prior to permitting the connection.'
  },
  {
    sr_code: 'SR 1.13', re_code: 'RE(1)', category: 'IAC',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Access via Untrusted Networks — Explicitly denied unless authorized',
    description: 'The control system shall deny access through untrusted networks unless explicitly authorized by the asset owner. Explicit authorization shall be based on identification and authentication of the requesting entity.'
  },

  // ================================================================
  // SR 2 — USE CONTROL (UC)
  // ================================================================
  {
    sr_code: 'SR 2.1', re_code: null, category: 'UC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Authorization Enforcement',
    description: 'The control system shall provide the capability to enforce authorizations assigned to all human users, software processes and devices. The control system shall enforce such authorizations on all interfaces of the control system according to the principles of least privilege and separation of duties.'
  },
  {
    sr_code: 'SR 2.1', re_code: 'RE(1)', category: 'UC',
    sl1: 0, sl2: 1, sl3: 1, sl4: 1,
    title: 'Authorization Enforcement — Authentication required for all users',
    description: 'The control system shall enforce authentication for all users prior to permitting any actions or access to the control system beyond the presentation of identity.'
  },
  {
    sr_code: 'SR 2.1', re_code: 'RE(2)', category: 'UC',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Authorization Enforcement — Permission mapping to roles',
    description: 'The control system shall provide the capability to map permissions to roles. This capability shall enforce permission mappings for all users according to their assigned roles.'
  },
  {
    sr_code: 'SR 2.1', re_code: 'RE(3)', category: 'UC',
    sl1: 0, sl2: 0, sl3: 0, sl4: 1,
    title: 'Authorization Enforcement — Supervisor override',
    description: 'The control system shall provide the capability for authorized supervisor personnel to override access permissions during specified time periods.'
  },
  {
    sr_code: 'SR 2.2', re_code: null, category: 'UC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Wireless Use Control',
    description: 'The control system shall provide the capability to authorize wireless connections to the control system. The control system shall enforce restrictions on wireless connections.'
  },
  {
    sr_code: 'SR 2.2', re_code: 'RE(1)', category: 'UC',
    sl1: 0, sl2: 1, sl3: 1, sl4: 1,
    title: 'Wireless Use Control — Prohibit unauthorized wireless use',
    description: 'The control system shall provide the capability to identify and prohibit the use of unauthorized wireless connections.'
  },
  {
    sr_code: 'SR 2.3', re_code: null, category: 'UC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Use Control for Portable and Mobile Devices',
    description: 'The control system shall provide the capability to identify and control the use of portable and mobile devices according to identified security policies.'
  },
  {
    sr_code: 'SR 2.3', re_code: 'RE(1)', category: 'UC',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Use Control for Portable and Mobile Devices — Prohibit use without explicit approval',
    description: 'The control system shall enforce restrictions on the use of portable and mobile devices and prohibit use of portable and mobile devices that have not been explicitly approved by the asset owner.'
  },
  {
    sr_code: 'SR 2.4', re_code: null, category: 'UC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Mobile Code',
    description: 'The control system shall provide the capability to enforce restrictions on the use of mobile code by identified control system components. Mobile code shall be controlled per the security policy defined by the asset owner.'
  },
  {
    sr_code: 'SR 2.4', re_code: 'RE(1)', category: 'UC',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Mobile Code — Prevent use of unauthorized mobile code',
    description: 'The control system shall provide the capability to prevent the use of unauthorized mobile code in the control system.'
  },
  {
    sr_code: 'SR 2.5', re_code: null, category: 'UC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Session Lock',
    description: 'The control system shall provide the capability to prevent further access by initiating a session lock after a configurable time period of inactivity or upon request. The session lock shall be maintained until the human user reestablishes access using appropriate identification and authentication procedures.'
  },
  {
    sr_code: 'SR 2.6', re_code: null, category: 'UC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Remote Session Termination',
    description: 'The control system shall provide the capability to terminate a remote session after a configurable time period of inactivity or upon request.'
  },
  {
    sr_code: 'SR 2.7', re_code: null, category: 'UC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Concurrent Session Control',
    description: 'The control system shall provide the capability to restrict the number of concurrent sessions per interface for any given time period for all human users, software processes or devices.'
  },
  {
    sr_code: 'SR 2.8', re_code: null, category: 'UC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Auditable Events',
    description: 'The control system shall provide the capability to generate audit records relevant to security for the following events: access control events, request errors, operating system events, control system events, backup and restore events, configuration change events, potential reconnaissance events, and audit log events.'
  },
  {
    sr_code: 'SR 2.8', re_code: 'RE(1)', category: 'UC',
    sl1: 0, sl2: 1, sl3: 1, sl4: 1,
    title: 'Auditable Events — Centrally managed audit trail',
    description: 'The control system shall provide the capability to centrally manage all audit trails. The management of audit trails shall include the ability to configure, protect, and store auditable event data.'
  },
  {
    sr_code: 'SR 2.9', re_code: null, category: 'UC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Audit Storage Capacity',
    description: 'The control system shall provide the capability to allocate audit record storage capacity and actions to be taken in the event of audit storage capacity being reached.'
  },
  {
    sr_code: 'SR 2.10', re_code: null, category: 'UC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Response to Audit Processing Failures',
    description: 'The control system shall provide the capability to alert and respond to audit processing failures. The control system shall take specific actions when audit failures occur.'
  },
  {
    sr_code: 'SR 2.11', re_code: null, category: 'UC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Timestamps',
    description: 'The control system shall provide timestamps for all audit records. The control system shall provide the capability to synchronize timestamps with an authoritative time source.'
  },
  {
    sr_code: 'SR 2.11', re_code: 'RE(1)', category: 'UC',
    sl1: 0, sl2: 1, sl3: 1, sl4: 1,
    title: 'Timestamps — Internal time synchronization',
    description: 'The control system shall provide the capability to synchronize the internal clock with an authoritative time source within an organization-defined time granularity.'
  },
  {
    sr_code: 'SR 2.12', re_code: null, category: 'UC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Non-Repudiation',
    description: 'The control system shall provide the capability to determine whether a given human user took a particular action.'
  },
  {
    sr_code: 'SR 2.12', re_code: 'RE(1)', category: 'UC',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Non-Repudiation — Non-repudiable communications',
    description: 'The control system shall provide the capability to create non-repudiable communications that include all the following: the content of the communication, the identity of the sender, the identity of the recipient, the time and date of the communication, and a means of authenticating the identity of the sender.'
  },

  // ================================================================
  // SR 3 — SYSTEM INTEGRITY (SI)
  // ================================================================
  {
    sr_code: 'SR 3.1', re_code: null, category: 'SI',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Communication Integrity',
    description: 'The control system shall provide the capability to protect the integrity of transmitted information. The control system shall provide the capability to detect changes to information during transmission.'
  },
  {
    sr_code: 'SR 3.1', re_code: 'RE(1)', category: 'SI',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Communication Integrity — Cryptographic integrity protection',
    description: 'The control system shall provide the capability to protect the integrity of transmitted information using cryptographic mechanisms.'
  },
  {
    sr_code: 'SR 3.2', re_code: null, category: 'SI',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Malicious Code Protection',
    description: 'The control system shall provide the capability to employ protection mechanisms to prevent, detect, report, and mitigate the effects of malicious code (e.g., viruses, worms, Trojan horses).'
  },
  {
    sr_code: 'SR 3.2', re_code: 'RE(1)', category: 'SI',
    sl1: 0, sl2: 1, sl3: 1, sl4: 1,
    title: 'Malicious Code Protection — Central management and reporting',
    description: 'The control system shall provide the capability to centrally manage and report malicious code protection mechanisms.'
  },
  {
    sr_code: 'SR 3.2', re_code: 'RE(2)', category: 'SI',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Malicious Code Protection — Automatic updates for malicious code protection',
    description: 'The control system shall provide the capability to automatically update malicious code protection mechanisms.'
  },
  {
    sr_code: 'SR 3.3', re_code: null, category: 'SI',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Security Functionality Verification',
    description: 'The control system shall provide the capability to verify the correct operation of security functions and notify the authorized user of the discovery of anomalies.'
  },
  {
    sr_code: 'SR 3.3', re_code: 'RE(1)', category: 'SI',
    sl1: 0, sl2: 1, sl3: 1, sl4: 1,
    title: 'Security Functionality Verification — Automated mechanisms',
    description: 'The control system shall provide the capability to use automated mechanisms to verify the correct operation of security functionality.'
  },
  {
    sr_code: 'SR 3.3', re_code: 'RE(2)', category: 'SI',
    sl1: 0, sl2: 0, sl3: 0, sl4: 1,
    title: 'Security Functionality Verification — Security functionality testing',
    description: 'The control system shall provide the capability to automatically perform security functionality testing on a continuous or configurable periodic basis.'
  },
  {
    sr_code: 'SR 3.4', re_code: null, category: 'SI',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Software and Information Integrity',
    description: 'The control system shall provide the capability to detect unauthorized changes to software and information by employing integrity verification tools.'
  },
  {
    sr_code: 'SR 3.4', re_code: 'RE(1)', category: 'SI',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Software and Information Integrity — Automated notification of integrity violations',
    description: 'The control system shall provide the capability to automatically notify the appropriate individuals upon discovery of discrepancies during integrity verification.'
  },
  {
    sr_code: 'SR 3.5', re_code: null, category: 'SI',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Input Validation',
    description: 'The control system shall validate inputs that have the potential to cause unintended effects in the control system or to adversely affect the safety, security or reliability of the IACS.'
  },
  {
    sr_code: 'SR 3.6', re_code: null, category: 'SI',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Deterministic Output',
    description: 'The control system shall provide the capability to produce a deterministic and correct output when implemented consistent with its design.'
  },
  {
    sr_code: 'SR 3.7', re_code: null, category: 'SI',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Error Handling',
    description: 'The control system shall identify and handle error conditions that result from control system-relevant error types, including: internal control system errors, network and communication errors, user input errors, and external interface errors.'
  },
  {
    sr_code: 'SR 3.8', re_code: null, category: 'SI',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Session Integrity',
    description: 'The control system shall provide the capability to protect the integrity of sessions for all human users, software processes and devices. The control system shall invalidate session identifiers upon user logout or other session termination.'
  },
  {
    sr_code: 'SR 3.8', re_code: 'RE(1)', category: 'SI',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Session Integrity — Invalidation of session identifiers after established conditions',
    description: 'The control system shall provide the capability to invalidate session identifiers after established conditions, including idle time thresholds and explicit user logouts.'
  },
  {
    sr_code: 'SR 3.9', re_code: null, category: 'SI',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Protection of Audit Information',
    description: 'The control system shall protect audit information and audit tools from unauthorized access, modification and deletion.'
  },
  {
    sr_code: 'SR 3.9', re_code: 'RE(1)', category: 'SI',
    sl1: 0, sl2: 0, sl3: 0, sl4: 1,
    title: 'Protection of Audit Information — Audit on read access',
    description: 'The control system shall provide the capability to audit read access to audit information.'
  },

  // ================================================================
  // SR 4 — DATA CONFIDENTIALITY (DC)
  // ================================================================
  {
    sr_code: 'SR 4.1', re_code: null, category: 'DC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Information Confidentiality',
    description: 'The control system shall provide the capability to protect the confidentiality of information on all interfaces for which there is a need for such protection.'
  },
  {
    sr_code: 'SR 4.1', re_code: 'RE(1)', category: 'DC',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Information Confidentiality — Protection of confidentiality at rest or in transit via untrusted network',
    description: 'The control system shall provide the capability to protect the confidentiality of information at rest or in transit via untrusted networks using cryptographic mechanisms.'
  },
  {
    sr_code: 'SR 4.1', re_code: 'RE(2)', category: 'DC',
    sl1: 0, sl2: 0, sl3: 0, sl4: 1,
    title: 'Information Confidentiality — Protection of confidentiality at rest',
    description: 'The control system shall provide the capability to protect the confidentiality of all information at rest using cryptographic mechanisms.'
  },
  {
    sr_code: 'SR 4.2', re_code: null, category: 'DC',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Information Persistence',
    description: 'The control system shall provide the capability to prevent information in shared resources from being accessible by other entities.'
  },
  {
    sr_code: 'SR 4.2', re_code: 'RE(1)', category: 'DC',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Information Persistence — Purging of shared memory resources',
    description: 'The control system shall provide the capability to purge all shared memory resources including registers, RAM, and buffers prior to being made available to other entities.'
  },
  {
    sr_code: 'SR 4.3', re_code: null, category: 'DC',
    sl1: 0, sl2: 1, sl3: 1, sl4: 1,
    title: 'Use of Cryptography',
    description: 'The control system shall provide the capability to use standard cryptographic algorithms (e.g., NIST FIPS approved) to protect the confidentiality of information in use, in transit, and at rest.'
  },

  // ================================================================
  // SR 5 — RESTRICTED DATA FLOW (RDF)
  // ================================================================
  {
    sr_code: 'SR 5.1', re_code: null, category: 'RDF',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Network Segmentation',
    description: 'The control system shall provide the capability to logically segment control system networks from non-control system networks. The control system shall provide the capability to logically segment control system networks from each other based on criticality.'
  },
  {
    sr_code: 'SR 5.1', re_code: 'RE(1)', category: 'RDF',
    sl1: 0, sl2: 1, sl3: 1, sl4: 1,
    title: 'Network Segmentation — Physical network segmentation',
    description: 'The control system shall provide the capability to physically segment control system networks from non-control system networks and from each other.'
  },
  {
    sr_code: 'SR 5.1', re_code: 'RE(2)', category: 'RDF',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Network Segmentation — Independence from non-control system networks',
    description: 'The control system shall provide the capability to operate in a manner that is independent of non-control system networks.'
  },
  {
    sr_code: 'SR 5.1', re_code: 'RE(3)', category: 'RDF',
    sl1: 0, sl2: 0, sl3: 0, sl4: 1,
    title: 'Network Segmentation — Logical and physical isolation of critical networks',
    description: 'The control system shall provide the capability to logically and physically isolate all critical control system networks from non-critical networks.'
  },
  {
    sr_code: 'SR 5.2', re_code: null, category: 'RDF',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Zone Boundary Protection',
    description: 'The control system shall provide the capability to monitor and control communications at zone boundaries to enforce the compartmentalization of information flow established in the control system security plan.'
  },
  {
    sr_code: 'SR 5.2', re_code: 'RE(1)', category: 'RDF',
    sl1: 0, sl2: 1, sl3: 1, sl4: 1,
    title: 'Zone Boundary Protection — Deny by default, allow by exception',
    description: 'The control system shall provide the capability to deny communications by default and allow communications by exception at zone boundaries.'
  },
  {
    sr_code: 'SR 5.2', re_code: 'RE(2)', category: 'RDF',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Zone Boundary Protection — Island mode',
    description: 'The control system shall provide the capability to operate in a "island mode" where communication with systems outside the control system is not required for safe operation.'
  },
  {
    sr_code: 'SR 5.2', re_code: 'RE(3)', category: 'RDF',
    sl1: 0, sl2: 0, sl3: 0, sl4: 1,
    title: 'Zone Boundary Protection — Prohibit all communications by default',
    description: 'The control system shall provide the capability to prohibit all communications across zone boundaries by default and require explicit configuration to allow communications.'
  },
  {
    sr_code: 'SR 5.3', re_code: null, category: 'RDF',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'General Purpose Person-to-Person Communication Restrictions',
    description: 'The control system shall provide the capability to restrict use of general purpose person-to-person communications (e.g., e-mail, instant messaging, peer-to-peer communications) to only approved channels and only those with a defined business need.'
  },
  {
    sr_code: 'SR 5.4', re_code: null, category: 'RDF',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Application Partitioning',
    description: 'The control system shall provide the capability to support the separation of user functionality (including user interface services) from control system management functionality.'
  },

  // ================================================================
  // SR 6 — TIMELY RESPONSE TO EVENTS (TRE)
  // ================================================================
  {
    sr_code: 'SR 6.1', re_code: null, category: 'TRE',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Audit Log Accessibility',
    description: 'The control system shall provide the capability to read and transfer audit logs to an external system. The control system shall create audit records that contain the information needed to support the review of security events.'
  },
  {
    sr_code: 'SR 6.1', re_code: 'RE(1)', category: 'TRE',
    sl1: 0, sl2: 1, sl3: 1, sl4: 1,
    title: 'Audit Log Accessibility — Programmatic access to audit logs',
    description: 'The control system shall provide programmatic access to audit logs. This access shall be read-only and shall not affect the normal operation of the control system.'
  },
  {
    sr_code: 'SR 6.2', re_code: null, category: 'TRE',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Continuous Monitoring',
    description: 'The control system shall provide the capability to continuously monitor all security mechanisms for correct operation and initiate appropriate responses when anomalies are discovered.'
  },
  {
    sr_code: 'SR 6.2', re_code: 'RE(1)', category: 'TRE',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Continuous Monitoring — Automated mechanisms for intrusion detection',
    description: 'The control system shall provide the capability to use automated mechanisms to detect intrusions and support the identification of potential intrusions.'
  },

  // ================================================================
  // SR 7 — RESOURCE AVAILABILITY (RA)
  // ================================================================
  {
    sr_code: 'SR 7.1', re_code: null, category: 'RA',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Denial of Service Protection',
    description: 'The control system shall provide the capability to operate in a degraded mode during a denial of service event. The control system shall provide the capability to limit the effects of the attack on other systems.'
  },
  {
    sr_code: 'SR 7.1', re_code: 'RE(1)', category: 'RA',
    sl1: 0, sl2: 1, sl3: 1, sl4: 1,
    title: 'Denial of Service Protection — Manage communication loads',
    description: 'The control system shall provide the capability to manage communication loads to mitigate the effects of information flooding types of denial of service attacks.'
  },
  {
    sr_code: 'SR 7.1', re_code: 'RE(2)', category: 'RA',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Denial of Service Protection — Limit effects on other systems',
    description: 'The control system shall provide the capability to limit the effects of denial of service attacks to the attacked component to protect other system components.'
  },
  {
    sr_code: 'SR 7.2', re_code: null, category: 'RA',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Resource Management',
    description: 'The control system shall provide the capability to manage the use of resources during operation. The control system shall provide the capability to limit the use of resources by priority.'
  },
  {
    sr_code: 'SR 7.3', re_code: null, category: 'RA',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Control System Backup',
    description: 'The control system shall provide the capability to perform and verify the integrity of backups of user-level information, system-level information, and system documentation.'
  },
  {
    sr_code: 'SR 7.3', re_code: 'RE(1)', category: 'RA',
    sl1: 0, sl2: 1, sl3: 1, sl4: 1,
    title: 'Control System Backup — Backup integrity verification',
    description: 'The control system shall provide the capability to verify the integrity of backups and to report integrity check failures to designated personnel.'
  },
  {
    sr_code: 'SR 7.3', re_code: 'RE(2)', category: 'RA',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Control System Backup — Backup storage protection',
    description: 'The control system shall provide the capability to protect the confidentiality and integrity of backup information at storage locations.'
  },
  {
    sr_code: 'SR 7.4', re_code: null, category: 'RA',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Control System Recovery and Reconstitution',
    description: 'The control system shall provide the capability to recover and reconstitute the control system to a known secure state after a disruption or failure.'
  },
  {
    sr_code: 'SR 7.4', re_code: 'RE(1)', category: 'RA',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Control System Recovery and Reconstitution — Meet recovery time objectives',
    description: 'The control system shall provide the capability to recover the control system within defined recovery time and recovery point objectives.'
  },
  {
    sr_code: 'SR 7.5', re_code: null, category: 'RA',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Emergency Power',
    description: 'The control system shall provide the capability to maintain safe state when electrical power is lost or interrupted.'
  },
  {
    sr_code: 'SR 7.6', re_code: null, category: 'RA',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Network and Security Configuration Settings',
    description: 'The control system shall provide the capability to restrict the use of unnecessary functions, ports, protocols and services. The control system shall prohibit access to security configuration settings by anyone not authorized.'
  },
  {
    sr_code: 'SR 7.6', re_code: 'RE(1)', category: 'RA',
    sl1: 0, sl2: 1, sl3: 1, sl4: 1,
    title: 'Network and Security Configuration Settings — Centrally managed security configuration settings',
    description: 'The control system shall provide the capability to centrally manage the security configuration settings of the control system.'
  },
  {
    sr_code: 'SR 7.7', re_code: null, category: 'RA',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Least Functionality',
    description: 'The control system shall be capable of being configured to provide only essential capabilities and to prohibit or restrict the use of functions, ports, protocols and/or services not required.'
  },
  {
    sr_code: 'SR 7.8', re_code: null, category: 'RA',
    sl1: 1, sl2: 1, sl3: 1, sl4: 1,
    title: 'Control System Component Inventory',
    description: 'The control system shall provide the capability to create and maintain an accurate inventory of all control system components.'
  },
  {
    sr_code: 'SR 7.8', re_code: 'RE(1)', category: 'RA',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Control System Component Inventory — Automated mechanisms support',
    description: 'The control system shall provide the capability to use automated mechanisms to maintain an up-to-date, complete, accurate, and readily available inventory of control system components.'
  },

  // Additional RE entries for completeness
  {
    sr_code: 'SR 1.1', re_code: 'RE(3)', category: 'IAC',
    sl1: 0, sl2: 0, sl3: 0, sl4: 1,
    title: 'Human User Identification and Authentication — Biometric authentication',
    description: 'The control system shall provide the capability to support biometric identification and authentication mechanisms for human users where applicable.'
  },
  {
    sr_code: 'SR 2.1', re_code: 'RE(4)', category: 'UC',
    sl1: 0, sl2: 0, sl3: 0, sl4: 1,
    title: 'Authorization Enforcement — Dual approval for critical actions',
    description: 'The control system shall provide the capability to require approval from a second authorized individual before executing critical control actions.'
  },
  {
    sr_code: 'SR 3.1', re_code: 'RE(2)', category: 'SI',
    sl1: 0, sl2: 0, sl3: 0, sl4: 1,
    title: 'Communication Integrity — Cryptographic integrity protection for all interfaces',
    description: 'The control system shall provide the capability to protect the integrity of all transmitted information using cryptographic mechanisms on all interfaces.'
  },
  {
    sr_code: 'SR 4.3', re_code: 'RE(1)', category: 'DC',
    sl1: 0, sl2: 0, sl3: 0, sl4: 1,
    title: 'Use of Cryptography — Certified cryptographic modules',
    description: 'The control system shall use cryptographic modules that are certified to a recognized standard (e.g., FIPS 140-2 or equivalent) for all cryptographic operations.'
  },
  {
    sr_code: 'SR 5.2', re_code: 'RE(4)', category: 'RDF',
    sl1: 0, sl2: 0, sl3: 0, sl4: 1,
    title: 'Zone Boundary Protection — Application-layer message inspection',
    description: 'The control system shall provide the capability to perform application-layer inspection of messages crossing zone boundaries to detect and block malicious content.'
  },
  {
    sr_code: 'SR 6.2', re_code: 'RE(2)', category: 'TRE',
    sl1: 0, sl2: 0, sl3: 0, sl4: 1,
    title: 'Continuous Monitoring — Automated response to detected events',
    description: 'The control system shall provide the capability to automatically respond to detected security events, including isolating affected components and notifying responsible personnel.'
  },
  {
    sr_code: 'SR 7.2', re_code: 'RE(1)', category: 'RA',
    sl1: 0, sl2: 0, sl3: 1, sl4: 1,
    title: 'Resource Management — Limit use of resources by priority',
    description: 'The control system shall provide the capability to limit the use of resources by software processes by priority to ensure critical control functions receive adequate resources.'
  },
  {
    sr_code: 'SR 7.6', re_code: 'RE(2)', category: 'RA',
    sl1: 0, sl2: 0, sl3: 0, sl4: 1,
    title: 'Network and Security Configuration Settings — Automated security configuration management',
    description: 'The control system shall provide the capability to automatically detect and report deviations from established security configuration baselines.'
  },
  {
    sr_code: 'SR 2.8', re_code: 'RE(2)', category: 'UC',
    sl1: 0, sl2: 0, sl3: 0, sl4: 1,
    title: 'Auditable Events — Compile audit records from multiple sources',
    description: 'The control system shall provide the capability to compile audit records from multiple sources into a system-wide audit trail that is time-correlated to within defined time granularity.'
  },
  {
    sr_code: 'SR 3.4', re_code: 'RE(2)', category: 'SI',
    sl1: 0, sl2: 0, sl3: 0, sl4: 1,
    title: 'Software and Information Integrity — Prevention of unauthorized installation',
    description: 'The control system shall provide the capability to prevent unauthorized installation of software and firmware, including cryptographically signed update packages.'
  },
  {
    sr_code: 'SR 5.1', re_code: 'RE(4)', category: 'RDF',
    sl1: 0, sl2: 0, sl3: 0, sl4: 1,
    title: 'Network Segmentation — Air gap for highest criticality zones',
    description: 'The control system shall provide the capability to establish air-gapped network segments for the highest criticality IACS zones, where no electronic connectivity is permitted without controlled data transfer mechanisms.'
  },
]

/**
 * Inserisce tutti i controlli IEC 62443-3-3 nel DB.
 * Idempotente: non duplica se già presenti (check su sr_code + re_code).
 *
 * @param {import('better-sqlite3').Database} db
 */
function seedIecControls(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO iec_controls (id, sr_code, re_code, title, sl1, sl2, sl3, sl4, category, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMany = db.transaction((controls) => {
    for (const ctrl of controls) {
      insert.run(
        uuidv4(),
        ctrl.sr_code,
        ctrl.re_code || null,
        ctrl.title,
        ctrl.sl1,
        ctrl.sl2,
        ctrl.sl3,
        ctrl.sl4,
        ctrl.category,
        ctrl.description
      )
    }
  })

  // Controlla se già seedato
  const existing = db.prepare('SELECT COUNT(*) as n FROM iec_controls').get()
  if (existing.n === 0) {
    insertMany(IEC_CONTROLS)
  }

  return IEC_CONTROLS.length
}

module.exports = { seedIecControls, IEC_CONTROLS }
