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
  name: string; // z.B. "Management", "Daten", "Gast"
  portNummer: number; // Zugeordneter Port
  typ: 'dhcp' | 'statisch';
  ipAdresse?: string; // nur bei statisch oder zur Dokumentation bei DHCP
  netzwerkbereich: string; // z.B. "192.168.1.0/24" - auch bei DHCP für Filter
  gateway?: string;
  dnsServer?: string[];
  vlan?: VLANKonfiguration;
  prioritaet?: number; // 1 = höchste Priorität
  aktiv: boolean; // true = konfiguriert und aktiv
  bemerkungen?: string;
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

export interface Geraet {
  id: string;
  standortId: string;
  name: string;
  hostname?: string; // Automatisch generierter Hostname
  geraetetyp: GeraeteTyp;
  modell: string;
  seriennummer?: string;
  standortDetails?: string; // Genaue Standortangabe (Raum, Container, etc.)
  bemerkungen?: string; // Allgemeine Bemerkungen für alle Geräte
  
  // Neue erweiterte IP-Konfiguration
  ipKonfigurationen: IPKonfiguration[];
  
  // Legacy-Kompatibilität (wird bei Migration gefüllt)
  ipKonfiguration?: {
    typ: 'dhcp' | 'statisch';
    ipAdresse?: string;
    netzwerkbereich?: string;
  };
  
  macAdresse?: string;
  anzahlNetzwerkports: number;
  belegteports: PortBelegung[];
  
  // Erweiterte Router-spezifische öffentliche IP-Konfiguration
  oeffentlicheIPKonfigurationen: OeffentlicheIPKonfiguration[];
  
  // Legacy Router-Konfiguration (wird bei Migration gefüllt)
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