// Grundlegende Interfaces für das Westfalen Network Tool

export interface Ansprechpartner {
  id: string;
  name: string;
  telefon?: string;
  email?: string;
  abteilung?: string;
  firma?: string;
  bemerkungen?: string;
  erstelltAm: Date;
  aktualisiertAm: Date;
}

export interface Standort {
  id: string;
  name: string; // z.B. DELIN1, DELIN2
  adresse: string;
  hostnamePrefix?: string; // z.B. DELIN2 für Hostname-Generierung
  standardNetzbereich?: string; // z.B. "10.202.0.0/16" - Standard-Netzbereich für IT-Netze
  ansprechpartner: {
    name: string;
    telefon?: string;
    email?: string;
  };
  ansprechpartnerIT?: Ansprechpartner | null;
  ansprechpartnerVorOrt?: Ansprechpartner | null;
  verfuegbareUplinks: any[]; // Legacy - wird durch automatische Router/SD-WAN Erkennung ersetzt
  erstelltAm: Date;
  aktualisiertAm: Date;
}

// UplinkTyp Interface entfernt - wird durch automatische Router/SD-WAN Erkennung ersetzt

// Neue IP- und VLAN-Konfiguration Interfaces
export interface VLANKonfiguration {
  vlanId: number;
  vlanName?: string;
  tagged: boolean; // true = tagged, false = untagged
  nacZugewiesen?: boolean; // Network Access Control zugewiesen
  bemerkungen?: string;
}

export interface IPKonfiguration {
  id: string;
  name: string; // z.B. "Management", "Daten", "Gast", "SPS-Netz"
  portNummer: number; // Zugeordneter Port
  typ: 'dhcp' | 'statisch';
  ipAdresse?: string; // nur bei statisch oder zur Dokumentation bei DHCP
  netzwerkbereich: string; // z.B. "192.168.1.0/24" - auch bei DHCP für Filter
  netzbereichTyp: 'IT' | 'OT' | 'Sonstiges'; // Netzbereich-Klassifikation
  gateway?: string;
  dnsServer?: string[];
  vlan?: VLANKonfiguration;
  prioritaet?: number; // 1 = höchste Priorität
  aktiv: boolean; // true = konfiguriert und aktiv
  bemerkungen?: string;
}

// SPS-Netz spezifische Konfiguration
export interface SPSNetzKonfiguration {
  id: string;
  name: string; // z.B. "SPS-Steuerung", "Antriebsnetz", "Sicherheitsnetz"
  netzwerkbereich: string; // z.B. "10.0.100.0/24"
  protokoll: 'Profinet' | 'Profibus' | 'Ethernet/IP' | 'Modbus TCP' | 'OPC UA' | 'Sonstiges';
  zykluszeit?: number; // in ms
  sicherheitseinstufung: 'SIL0' | 'SIL1' | 'SIL2' | 'SIL3' | 'SIL4' | 'Keine';
  redundanz: boolean; // Redundante Netzwerkkonfiguration
  
  // Profinet-spezifische Eigenschaften
  profinetEigenschaften?: {
    ioSupervisor?: string; // PROFINET IO-Supervisor
    rtClass?: 'RT_CLASS_1' | 'RT_CLASS_2' | 'RT_CLASS_3' | 'RT_CLASS_UDP'; // Real-Time Klasse
    updateZeit?: number; // Update-Zeit in ms
    deviceName?: string; // Profinet Device Name
    mrpRing?: boolean; // Media Redundancy Protocol
    topologieErkennung?: boolean; // LLDP Topologie-Erkennung
    isochronBetrieb?: boolean; // Synchroner Betrieb
  };
  
  bemerkungen?: string;
}

// OT-Gerät spezifische Eigenschaften
export interface OTGeraetEigenschaften {
  // Verdichter-spezifische Eigenschaften
  verdichterEigenschaften?: {
    maxDruck?: number; // in bar
    maxLeistung?: number; // in kW
    betriebstemperatur?: { min: number; max: number }; // in °C
    kuehlungstyp?: 'Luft' | 'Wasser' | 'Öl';
    steuerungsart?: 'Frequenzumrichter' | 'Ein/Aus' | 'Mehrstufig';
  };
  
  // SPS-spezifische Eigenschaften
  spsEigenschaften?: {
    cpuTyp?: string; // z.B. "S7-1500", "CompactLogix"
    speichergroesse?: number; // in KB
    digitalInputs?: number;
    digitalOutputs?: number;
    analogInputs?: number;
    analogOutputs?: number;
    kommunikationsmodule?: string[]; // z.B. ["Profinet", "Profibus"]
    sicherheitsfunktionen?: boolean; // Failsafe-Funktionen
    redundanz?: boolean;
  };
  
  // H2-Versorger-spezifische Eigenschaften
  h2VersorgerEigenschaften?: {
    maxDruck?: number; // in bar
    maxDurchfluss?: number; // in Nm³/h
    reinheitsgrad?: number; // in %
    speicherkapazitaet?: number; // in Nm³
    detektionssystem?: string; // z.B. "Leckage-Detektor"
    sicherheitsventile?: number; // Anzahl
  };
  
  // Industrial Switch-spezifische Eigenschaften
  industrialSwitchEigenschaften?: {
    managedSwitch?: boolean;
    portAnzahl?: number;
    poeSupport?: boolean;
    betriebstemperatur?: { min: number; max: number }; // in °C
    schutzklasse?: string; // z.B. "IP65", "IP20"
    redundanzProtokolle?: string[]; // z.B. ["RSTP", "MRP", "HSR", "PRP"]
    vlanSupport?: boolean;
    qosSupport?: boolean;
    
    // Profinet-spezifische Switch-Eigenschaften
    profinetSupport?: boolean;
    mrpManager?: boolean; // Media Redundancy Protocol Manager
    mrpClient?: boolean; // Media Redundancy Protocol Client
    fastStartup?: boolean; // Schneller Startup für Profinet
    ptp1588Support?: boolean; // Precision Time Protocol für Synchronisation
    rtClass3Support?: boolean; // Unterstützung für Real-Time Class 3
    portMirroring?: boolean; // für Diagnose
    lldpSupport?: boolean; // Link Layer Discovery Protocol
  };
  
  // Allgemeine OT-Eigenschaften
  betriebsumgebung?: {
    temperaturbereich?: { min: number; max: number }; // in °C
    luftfeuchtigkeit?: { min: number; max: number }; // in %
    schutzklasse?: string; // IP-Schutzklasse
    vibrationsklasse?: string;
    emvKlasse?: string; // Elektromagnetische Verträglichkeit
  };
  
  wartung?: {
    wartungsintervall?: number; // in Tagen
    letzteWartung?: Date;
    naechsteWartung?: Date;
    wartungsverantwortlicher?: string;
  };
  
  sicherheit?: {
    sicherheitseinstufung?: 'SIL0' | 'SIL1' | 'SIL2' | 'SIL3' | 'SIL4' | 'Keine';
    notabschaltung?: boolean;
    redundanz?: boolean;
    failsafeFunktionen?: string[];
  };
}

// Erweiterte öffentliche IP-Konfiguration für Router
export interface OeffentlicheIPKonfiguration {
  id: string;
  typ: 'einzelip' | 'subnet';
  
  // Für einzelne IP (wie bisher)
  einzelIP?: {
    adresse?: string; // statische IP oder leer bei dynamisch
    dynamisch?: boolean; // optional für TypeScript-Kompatibilität
    dyndnsAktiv?: boolean;
    dyndnsAdresse?: string;
  };
  
  // Für Subnet-Konfiguration
  subnet?: {
    netzwerkadresse?: string; // optional für TypeScript-Kompatibilität
    gateway?: string; // optional für TypeScript-Kompatibilität
    nutzbareIPs?: OeffentlicheIP[]; // optional für TypeScript-Kompatibilität
  };
  
  aktiv: boolean;
  bemerkungen?: string;
}

export interface OeffentlicheIP {
  id: string;
  ipAdresse: string; // z.B. "203.0.113.2"
  verwendung?: string; // z.B. "Webserver", "Mail", "VPN"
  belegt: boolean;
  bemerkungen?: string;
}

// =================== PURDUE MODEL & IT/OT SECURITY ===================

export enum PurdueLevel {
  LEVEL_0 = 'Level 0 - Field Level (Sensoren, Aktoren)',
  LEVEL_1 = 'Level 1 - Control Level (PLC, SPS)',
  LEVEL_2 = 'Level 2 - Supervisory Level (SCADA, HMI)',
  LEVEL_3 = 'Level 3 - Manufacturing Operations (MES)',
  LEVEL_4 = 'Level 4 - Business Planning (ERP)',
  LEVEL_5 = 'Level 5 - Enterprise Level',
  UNDEFINED = 'Nicht definiert'
}

export enum SecurityZone {
  MANUFACTURING_ZONE = 'Manufacturing Zone (L0-L2)',
  CONTROL_ZONE = 'Control Zone',
  DMZ = 'DMZ (Demilitarized Zone)',
  CORPORATE_NETWORK = 'Corporate Network (L3-L5)',
  SAFETY_ZONE = 'Safety Zone (SIS)',
  REMOTE_ACCESS_ZONE = 'Remote Access Zone',
  UNDEFINED = 'Nicht definiert'
}

export enum IEC62443SecurityLevel {
  SL1 = 'SL-1 (Protection against casual or coincidental violation)',
  SL2 = 'SL-2 (Protection against intentional violation using simple means)',
  SL3 = 'SL-3 (Protection against intentional violation using sophisticated means)',
  SL4 = 'SL-4 (Protection against intentional violation using state-of-the-art means)',
  UNDEFINED = 'Nicht definiert'
}

export interface SecurityAssessment {
  id: string;
  geraetId: string;
  iec62443Level: IEC62443SecurityLevel;
  risikoEinstufung: 'Niedrig' | 'Mittel' | 'Hoch' | 'Kritisch';
  bedrohungsanalyse: string;
  schutzmaßnahmen: string[];
  letzteBewertung: Date;
  naechsteBewertung: Date;
  verantwortlicher: string;
  bemerkungen?: string;
}

export interface NetworkSegmentation {
  id: string;
  name: string;
  beschreibung: string;
  securityZone: SecurityZone;
  vlanIds: number[];
  firewallRules: FirewallRule[];
  allowedProtocols: string[];
  accessControlList: string[];
  monitoringLevel: 'Basic' | 'Enhanced' | 'Deep Packet Inspection';
  standortId: string;
  aktiv: boolean;
}

export interface FirewallRule {
  id: string;
  name: string;
  sourceZone: SecurityZone;
  destinationZone: SecurityZone;
  protocol: string;
  sourcePort?: string;
  destinationPort?: string;
  action: 'Allow' | 'Deny' | 'Log';
  prioritaet: number;
  beschreibung: string;
  aktiv: boolean;
}

// =================== INDUSTRIAL PROTOCOL MANAGEMENT ===================

export enum IndustrialProtocol {
  PROFINET = 'PROFINET',
  PROFIBUS = 'PROFIBUS',
  ETHERNET_IP = 'EtherNet/IP',
  MODBUS_TCP = 'Modbus TCP',
  MODBUS_RTU = 'Modbus RTU',
  OPC_UA = 'OPC UA',
  OPC_DA = 'OPC DA',
  BACnet = 'BACnet',
  HART = 'HART',
  FOUNDATION_FIELDBUS = 'Foundation Fieldbus',
  CANBUS = 'CAN Bus',
  DEVICENET = 'DeviceNet',
  CONTROLNET = 'ControlNet',
  AS_INTERFACE = 'AS-Interface',
  IO_LINK = 'IO-Link',
  SONSTIGES = 'Sonstiges'
}

export interface CommunicationMatrix {
  id: string;
  quellGeraetId: string;
  zielGeraetId: string;
  protokoll: IndustrialProtocol;
  richtung: 'Bidirectional' | 'Source to Target' | 'Target to Source';
  datentyp: string; // z.B. "Process Data", "Alarms", "Diagnostics"
  zykluszeit?: number; // in ms
  prioritaet: 'Low' | 'Medium' | 'High' | 'Critical';
  realTimeRequirement: boolean;
  maxLatenz?: number; // in ms
  maxJitter?: number; // in ms
  sicherheitsrelevant: boolean;
  verschluesselung: boolean;
  authentifizierung: boolean;
  bemerkungen?: string;
  standortId: string;
}

// =================== ASSET LIFECYCLE MANAGEMENT ===================

export interface AssetLifecycle {
  id: string;
  geraetId: string;
  installationsDatum: Date;
  inbetriebnahmeDatum?: Date;
  geplantesEOL?: Date; // End of Life
  erwarteteLebensdauer: number; // in Jahren
  aktuelleFirmwareVersion?: string;
  letzteFirmwareUpdate?: Date;
  wartungsintervall: number; // in Tagen
  letzteWartung?: Date;
  naechsteWartung?: Date;
  wartungsverantwortlicher?: string;
  kritikalitaet: 'Niedrig' | 'Mittel' | 'Hoch' | 'Kritisch';
  ersatzteilVerfuegbarkeit: 'Verfügbar' | 'Begrenzt' | 'EOL' | 'Unbekannt';
  supportStatus: 'Vollständig' | 'Eingeschränkt' | 'EOL' | 'Unbekannt';
  bemerkungen?: string;
}

export interface ErsatzteilManagement {
  id: string;
  geraetId: string;
  teilenummer: string;
  bezeichnung: string;
  lieferant: string;
  lagerbestand: number;
  mindestbestand: number;
  letzteBestellung?: Date;
  kostenstelle?: string;
  kritikalitaet: 'Niedrig' | 'Mittel' | 'Hoch' | 'Kritisch';
  lagerort?: string;
  bemerkungen?: string;
}

export interface FirmwareManagement {
  id: string;
  geraetId: string;
  aktuelleVersion: string;
  verfuegbareVersion?: string;
  updateErforderlich: boolean;
  sicherheitsUpdate: boolean;
  geplantesUpdateDatum?: Date;
  updateVerantwortlicher?: string;
  releaseNotes?: string;
  rollbackMoeglich: boolean;
  testErforderlich: boolean;
  bemerkungen?: string;
}

// =================== OPERATIONAL EXCELLENCE ===================

export interface ProcessIntegration {
  id: string;
  geraetId: string;
  prozessName: string;
  prozessBeschreibung: string;
  kritischeFunktion: boolean;
  ausfallAuswirkung: 'Keine' | 'Gering' | 'Mittel' | 'Hoch' | 'Kritisch';
  redundanzVorhanden: boolean;
  notfallProzedur?: string;
  verantwortlicherBetreiber?: string;
  dokumentPfad?: string; // P&ID, Verfahrensfließbild
  bemerkungen?: string;
}

export interface AlarmManagement {
  id: string;
  geraetId: string;
  alarmTyp: string;
  prioritaet: 'Low' | 'Medium' | 'High' | 'Emergency';
  alarmBeschreibung: string;
  handlungsanweisung: string;
  eskalationsMatrix: string[];
  quittierungErforderlich: boolean;
  automatischeAktion?: string;
  logRetention: number; // in Tagen
  benachrichtigungsgruppe?: string;
  bemerkungen?: string;
}

export interface GoldenConfiguration {
  id: string;
  geraetId: string;
  konfigurationsname: string;
  version: string;
  erstelltAm: Date;
  erstelltVon: string;
  genehmigt: boolean;
  genehmigtVon?: string;
  genehmigtAm?: Date;
  konfigurationsDaten: string; // JSON als String
  beschreibung: string;
  aenderungsgrund?: string;
  rollbackMoeglich: boolean;
  aktiv: boolean;
}

export interface ChangeManagement {
  id: string;
  geraetId?: string;
  standortId: string;
  changeNummer: string;
  titel: string;
  beschreibung: string;
  changeTyp: 'Standard' | 'Normal' | 'Emergency';
  prioritaet: 'Low' | 'Medium' | 'High' | 'Critical';
  antragsteller: string;
  antragsGrund: string;
  risikoAnalyse: string;
  implementierungsplan: string;
  rollbackPlan: string;
  testPlan?: string;
  genehmigerEbene1?: string;
  genehmigerEbene2?: string;
  geplantesStartDatum?: Date;
  geplantesEndeDatum?: Date;
  tatsaechlichesStartDatum?: Date;
  tatsaechlichesEndeDatum?: Date;
  status: 'Draft' | 'Submitted' | 'Approved' | 'In Progress' | 'Completed' | 'Cancelled' | 'Rejected';
  ergebnis?: string;
  bemerkungen?: string;
}

// =================== COMPLIANCE & REPORTING ===================

export interface ComplianceRequirement {
  id: string;
  standard: string; // z.B. "FDA 21 CFR Part 11", "ISO 27001", "IEC 62443"
  anforderung: string;
  beschreibung: string;
  kategorie: 'Security' | 'Safety' | 'Quality' | 'Environmental' | 'Regulatory';
  anwendbarAuf: ('IT' | 'OT' | 'Hybrid')[];
  pruefintervall: number; // in Monaten
  verantwortlicher?: string;
  dokumentationsErforderlich: boolean;
  aktiv: boolean;
}

export interface ComplianceAssessment {
  id: string;
  geraetId: string;
  requirementId: string;
  bewertungsDatum: Date;
  bewerter: string;
  konformitaetsStatus: 'Compliant' | 'Non-Compliant' | 'Partially Compliant' | 'Not Assessed';
  abweichungen?: string;
  massnahmen?: string;
  frist?: Date;
  naechstePruefung?: Date;
  bemerkungen?: string;
}

export interface AuditTrail {
  id: string;
  zeitstempel: Date;
  benutzer: string;
  aktion: string;
  objektTyp: string; // z.B. "Gerät", "Verbindung", "Konfiguration"
  objektId: string;
  alteDaten?: string; // JSON
  neueDaten?: string; // JSON
  ip_adresse?: string;
  grund?: string;
  genehmiger?: string;
}

export interface DocumentationTemplate {
  id: string;
  name: string;
  beschreibung: string;
  kategorie: 'Validation' | 'Security' | 'Safety' | 'Operational' | 'Maintenance';
  anwendungsbereich: ('IT' | 'OT' | 'Hybrid')[];
  template_pfad: string;
  version: string;
  erstelltAm: Date;
  aktiv: boolean;
}

// =================== ERWEITERTE GERÄTE-EIGENSCHAFTEN ===================

// Erweiterte Geräte-Schnittstelle mit IT/OT-spezifischen Eigenschaften
export interface Geraet {
  id: string;
  standortId: string;
  name: string;
  hostname?: string;
  geraetetyp: GeraeteTyp;
  modell: string;
  seriennummer?: string;
  standortDetails?: string;
  bemerkungen?: string;
  
  // ===== PURDUE MODEL & SECURITY =====
  purdueLevel: PurdueLevel;
  securityZone: SecurityZone;
  securityAssessment?: SecurityAssessment;
  
  // ===== ASSET LIFECYCLE =====
  assetLifecycle?: AssetLifecycle;
  ersatzteile?: ErsatzteilManagement[];
  firmwareManagement?: FirmwareManagement;
  
  // ===== OPERATIONAL EXCELLENCE =====
  processIntegration?: ProcessIntegration[];
  alarmManagement?: AlarmManagement[];
  goldenConfigs?: GoldenConfiguration[];
  
  // ===== COMPLIANCE =====
  complianceAssessments?: ComplianceAssessment[];
  
  // ===== EXISTING PROPERTIES =====
  ipKonfigurationen: IPKonfiguration[];
  spsNetzKonfigurationen?: SPSNetzKonfiguration[];
  otEigenschaften?: OTGeraetEigenschaften;
  geraetekategorie: 'IT' | 'OT' | 'Hybrid';
  
  ipKonfiguration?: {
    typ: 'dhcp' | 'statisch';
    ipAdresse?: string;
    netzwerkbereich?: string;
  };
  
  macAdresse?: string;
  anzahlNetzwerkports: number;
  belegteports: PortBelegung[];
  oeffentlicheIPKonfigurationen: OeffentlicheIPKonfiguration[];
  
  hatOeffentlicheIp?: boolean;
  oeffentlicheIpTyp?: 'dynamisch' | 'statisch';
  dyndnsAktiv?: boolean;
  dyndnsAdresse?: string;
  statischeOeffentlicheIp?: string;
  
  position?: {
    x: number;
    y: number;
  };
  rackPosition?: {
    rack: string;
    einheit: number;
  };
  erstelltAm: Date;
  aktualisiertAm: Date;
}

export type GeraeteTyp = string; // Flexible Gerätetypen aus Datenbank

export interface GeraetetypDefinition {
  id: string;
  name: string;
  beschreibung?: string;
  icon?: string;
  farbe?: string;
  hostnamePrefix?: string;
  kategorie?: 'IT' | 'OT' | 'Hybrid'; // Geräte-Kategorisierung
  aktiv: boolean;
  erstellt_am?: string;
  aktualisiert_am?: string;
}

export type PortTyp = 
  | 'RJ45'
  | 'SFP'
  | 'SFP+'
  | 'QSFP'
  | 'SFP28'
  | 'QSFP28'
  | 'Konsole'
  | 'Management'
  | 'PoE'
  | 'M12'
  | 'M8'
  | 'Profinet'
  | 'Sonstiges';

export interface PortBelegung {
  portNummer: number;
  verbindungId?: string;
  beschreibung?: string;
  belegt: boolean;
  portTyp?: PortTyp;
  geschwindigkeit?: string; // z.B. "1G", "10G", "25G"
  label?: string; // z.B. "DMZ", "WAN", "LAN"
}

export interface Verbindung {
  id: string;
  standortId: string;
  quellGeraetId: string;
  quellPort: number;
  zielGeraetId: string;
  zielPort: number;
  kabeltyp: Kabeltyp;
  kabeleigenschaften: {
    laenge?: number; // Meter
    farbe?: string;
    kategorie?: string; // z.B. Cat6, Cat6a
  };
  bemerkungen?: string;
  erstelltAm: Date;
}

export type Kabeltyp = 
  | 'RJ45 Cat5e'
  | 'RJ45 Cat6'
  | 'RJ45 Cat6a'
  | 'Fibre Singlemode'
  | 'Fibre Multimode'
  | 'Coax'
  | 'Profinet Standard'
  | 'Profinet Fast Connect'
  | 'Profinet Robust'
  | 'Profinet Marine'
  | 'M12 4-polig'
  | 'M12 8-polig'
  | 'M8 3-polig'
  | 'M8 4-polig'
  | 'Sonstiges';

export interface NetzwerkDiagramm {
  id: string;
  standortId: string;
  name: string;
  geraete: GeraetPosition[];
  verbindungen: VerbindungsLinie[];
  typ: 'Netzwerkdiagramm' | 'Rack-Diagramm';
  einstellungen: DiagrammEinstellungen;
}

export interface GeraetPosition {
  geraetId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface VerbindungsLinie {
  verbindungId: string;
  pfad: {
    x: number;
    y: number;
  }[];
  stil: {
    farbe: string;
    dicke: number;
    linientyp: 'solid' | 'dashed' | 'dotted';
  };
}

export interface DiagrammEinstellungen {
  hintergrundfarbe: string;
  rasterAnzeigen: boolean;
  beschriftungenAnzeigen: boolean;
  portNummerAnzeigen: boolean;
  automatischesLayout: boolean;
}

export interface ExportOptionen {
  format: 'PDF' | 'PNG' | 'JSON';
  einschliessen: {
    standortdetails: boolean;
    geraetedetails: boolean;
    verbindungsdetails: boolean;
    diagramm: boolean;
  };
  seitenformat?: 'A4' | 'A3' | 'Letter';
  ausrichtung?: 'Hochformat' | 'Querformat';
}

export interface BenutzerEinstellungen {
  standardDiagrammTyp: 'Netzwerkdiagramm' | 'Rack-Diagramm';
  automatischSpeichern: boolean;
  benachrichtigungenAktiv: boolean;
  sprache: 'de' | 'en';
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StandortMitStatistiken extends Standort {
  anzahlGeraete: number;
  anzahlVerbindungen: number;
  letzteAktualisierung: Date;
}

// Switch-Stack Interfaces
export interface SwitchStack {
  id: string;
  standortId: string;
  name: string;
  beschreibung?: string;
  mitglieder: StackMitglied[];
  stackVerbindungen: StackVerbindung[];
  erstelltAm: Date;
  aktualisiertAm: Date;
}

export interface StackMitglied {
  id: string;
  stackId: string;
  geraetId: string;
  stackNummer: number;
  prioritaet: number;
  geraet?: Geraet; // Referenz zum Gerät
}

export interface StackVerbindung {
  id: string;
  stackId: string;
  quellGeraetId: string;
  quellPort: number;
  zielGeraetId: string;
  zielPort: number;
  verbindungstyp: 'DAC' | 'Fiber' | 'Kupfer';
  bemerkungen?: string;
}

export interface StackPort {
  stackNummer: number;
  portNummer: number;
  bezeichnung: string; // z.B. "1:24"
  belegt: boolean;
  geraetId: string;
  verbindungId?: string;
} 

// Netzbereichsverwaltung Interfaces
export interface Netzbereich {
  id: string;
  name: string;
  beschreibung: string;
  ip_bereich: string; // z.B. "10.202.0.0/16" oder "192.168.1.0/24"
  netztyp: NetzbereichTyp;
  standort_id: string;
  vlan_id?: number;
  gateway?: string;
  dns_server?: string;
  ntp_server?: string;
  dhcp_aktiv: boolean;
  dhcp_bereich?: string; // z.B. "10.202.1.100-10.202.1.200"
  erstellt_am: string;
  geaendert_am: string;
  aktiv: boolean;
  bemerkungen?: string;
}

export enum NetzbereichTyp {
  IT_NETZ = 'IT-Netz',
  OT_NETZ = 'OT-Netz',  
  SONSTIGES = 'Sonstiges'
}

export interface NetzbereichFormData {
  name: string;
  beschreibung: string;
  ip_bereich: string;
  netztyp: NetzbereichTyp;
  standort_id: string;
  vlan_id?: number;
  gateway?: string;
  dns_server?: string;
  ntp_server?: string;
  dhcp_aktiv: boolean;
  dhcp_bereich?: string;
  aktiv: boolean;
  bemerkungen?: string;
} 

// =================== VISUALIZATION & REPORTING ===================

export interface HeatMapData {
  geraetId: string;
  metrik: 'Kritikalität' | 'Ausfallrisiko' | 'Wartungsbedarf' | 'Sicherheitsrisiko';
  wert: number; // 0-100
  farbe: string;
  label: string;
}

export interface NetworkTopologyView {
  id: string;
  name: string;
  standortId: string;
  ansichtsTyp: 'Physical' | 'Logical' | 'Security Zones' | 'Purdue Levels';
  filterKonfiguration: {
    zeigePurdueLevel: PurdueLevel[];
    zeigeSecurityZones: SecurityZone[];
    zeigeKategorien: ('IT' | 'OT' | 'Hybrid')[];
    zeigeProtokolle: IndustrialProtocol[];
  };
  layoutKonfiguration: any; // Spezifische Layout-Einstellungen
  erstelltAm: Date;
  aktiv: boolean;
} 