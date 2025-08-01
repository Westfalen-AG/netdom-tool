const ping = require('ping');
const portscanner = require('portscanner');
const { networkInterfaces } = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const dns = require('dns');

const execAsync = promisify(exec);

class NetworkScanner {
  constructor() {
    // Performance-Konfiguration - Einfach und schnell
    this.config = {
      hostDiscovery: {
        batchSize: 4,            // Immer 4 Hosts gleichzeitig
        pingTimeout: 3000,       // 3 Sekunden Ping timeout
        tcpTimeout: 2000,        // TCP timeout (falls benötigt)
        batchDelay: 0            // Keine Pause zwischen Batches
      },
      portScanning: {
        concurrentHosts: 4,      // 4 Hosts parallel für Port-Scan
        portTimeout: 2000,       // Port-Scan timeout in ms
        batchDelay: 100          // Kurze Pause zwischen Port-Scan Batches
      }
    };
    // Bekannte Ports für verschiedene Services
    this.commonPorts = {
      // Web Services
      80: { name: 'HTTP', service: 'Web Server', category: 'Web' },
      443: { name: 'HTTPS', service: 'Secure Web Server', category: 'Web' },
      8080: { name: 'HTTP Alt', service: 'Alternative HTTP', category: 'Web' },
      8443: { name: 'HTTPS Alt', service: 'Alternative HTTPS', category: 'Web' },
      8000: { name: 'HTTP Dev', service: 'Development Server', category: 'Web' },
      3000: { name: 'Node.js', service: 'Node.js Development', category: 'Web' },
      5000: { name: 'Flask', service: 'Flask Development', category: 'Web' },
      9000: { name: 'Web Alt', service: 'Alternative Web', category: 'Web' },
      
      // Remote Access
      22: { name: 'SSH', service: 'Secure Shell', category: 'Remote' },
      23: { name: 'Telnet', service: 'Telnet', category: 'Remote' },
      3389: { name: 'RDP', service: 'Remote Desktop', category: 'Remote' },
      5900: { name: 'VNC', service: 'VNC Remote Desktop', category: 'Remote' },
      5901: { name: 'VNC Alt', service: 'VNC Alternative', category: 'Remote' },
      5938: { name: 'TeamViewer', service: 'TeamViewer', category: 'Remote' },
      7070: { name: 'AnyDesk', service: 'AnyDesk', category: 'Remote' },
      
      // Databases
      3306: { name: 'MySQL', service: 'MySQL Database', category: 'Database' },
      5432: { name: 'PostgreSQL', service: 'PostgreSQL Database', category: 'Database' },
      1433: { name: 'MSSQL', service: 'Microsoft SQL Server', category: 'Database' },
      1521: { name: 'Oracle', service: 'Oracle Database', category: 'Database' },
      27017: { name: 'MongoDB', service: 'MongoDB Database', category: 'Database' },
      6379: { name: 'Redis', service: 'Redis Database', category: 'Database' },
      
      // Network Management
      161: { name: 'SNMP', service: 'Network Management', category: 'Network' },
      162: { name: 'SNMP Trap', service: 'SNMP Notifications', category: 'Network' },
      
      // File Services
      21: { name: 'FTP', service: 'File Transfer', category: 'File' },
      22: { name: 'SFTP', service: 'Secure File Transfer', category: 'File' },
      445: { name: 'SMB', service: 'Windows File Sharing', category: 'File' },
      139: { name: 'NetBIOS', service: 'Windows NetBIOS', category: 'File' },
      
      // Email
      25: { name: 'SMTP', service: 'Mail Server', category: 'Email' },
      110: { name: 'POP3', service: 'Mail Retrieval', category: 'Email' },
      143: { name: 'IMAP', service: 'Mail Access', category: 'Email' },
      993: { name: 'IMAPS', service: 'Secure Mail Access', category: 'Email' },
      995: { name: 'POP3S', service: 'Secure Mail Retrieval', category: 'Email' },
      
      // Industrial/IoT
      502: { name: 'Modbus', service: 'Modbus TCP', category: 'Industrial' },
      102: { name: 'S7', service: 'Siemens S7', category: 'Industrial' },
      44818: { name: 'EtherNet/IP', service: 'Industrial Ethernet', category: 'Industrial' },
      1883: { name: 'MQTT', service: 'IoT Messaging', category: 'IoT' },
      8883: { name: 'MQTT SSL', service: 'Secure IoT Messaging', category: 'IoT' },
      
      // Other Common Services
      53: { name: 'DNS', service: 'Domain Name Service', category: 'Network' },
      67: { name: 'DHCP', service: 'DHCP Server', category: 'Network' },
      68: { name: 'DHCP Client', service: 'DHCP Client', category: 'Network' },
      123: { name: 'NTP', service: 'Network Time Protocol', category: 'Network' },
      514: { name: 'Syslog', service: 'System Logging', category: 'Network' },
    };
    
    this.scanProgress = {
      totalHosts: 0,
      scannedHosts: 0,
      foundHosts: 0,
      currentOperation: 'Initialisierung...',
      results: []
    };
  }

  // IP-Bereich in einzelne IPs aufteilen
  parseNetworkRange(ipRange) {
    const hosts = [];
    
    if (ipRange.includes('/')) {
      // CIDR Notation (z.B. 192.168.1.0/24)
      const [network, prefixLength] = ipRange.split('/');
      const prefix = parseInt(prefixLength);
      const networkParts = network.split('.').map(Number);
      
      if (prefix >= 24) {
        // /24 oder kleiner - Host-Teil im letzten Oktett
        const hostBits = 32 - prefix;
        const maxHosts = Math.pow(2, hostBits) - 2; // -2 für Netzwerk- und Broadcast-Adresse
        
        for (let i = 1; i <= maxHosts; i++) {
          hosts.push(`${networkParts[0]}.${networkParts[1]}.${networkParts[2]}.${i}`);
        }
      } else if (prefix >= 16) {
        // /16 bis /23 - Host-Teil in den letzten beiden Oktetts
        const hostBits = 32 - prefix;
        const maxHosts = Math.pow(2, hostBits) - 2;
        
        for (let i = 1; i <= Math.min(maxHosts, 1000); i++) { // Limit für Performance
          const thirdOctet = Math.floor(i / 256);
          const fourthOctet = i % 256;
          if (fourthOctet === 0) continue; // Skip network addresses
          hosts.push(`${networkParts[0]}.${networkParts[1]}.${thirdOctet}.${fourthOctet}`);
        }
      }
    } else if (ipRange.includes('-')) {
      // Range (z.B. 192.168.1.1-192.168.1.254)
      const [startIP, endIP] = ipRange.split('-');
      const startParts = startIP.split('.').map(Number);
      const endParts = endIP.split('.').map(Number);
      
      const startNum = (startParts[0] << 24) + (startParts[1] << 16) + (startParts[2] << 8) + startParts[3];
      const endNum = (endParts[0] << 24) + (endParts[1] << 16) + (endParts[2] << 8) + endParts[3];
      
      for (let num = startNum; num <= endNum && hosts.length < 1000; num++) {
        const ip = [
          (num >>> 24) & 255,
          (num >>> 16) & 255,
          (num >>> 8) & 255,
          num & 255
        ].join('.');
        hosts.push(ip);
      }
    } else {
      // Einzelne IP
      hosts.push(ipRange);
    }
    
    return hosts;
  }

  // Hostname-Auflösung
  async resolveHostname(ip) {
    try {
      const hostname = await new Promise((resolve, reject) => {
        dns.reverse(ip, (err, hostnames) => {
          if (err) {
            // Fallback: Versuche mit nslookup
            exec(`nslookup ${ip}`, (error, stdout, stderr) => {
              if (error) {
                resolve(null);
                return;
              }
              
              // Parse nslookup output für Windows
              const lines = stdout.split('\n');
              for (const line of lines) {
                if (line.includes('Name:')) {
                  const hostname = line.split('Name:')[1]?.trim();
                  if (hostname && hostname !== ip) {
                    resolve(hostname);
                    return;
                  }
                }
              }
              resolve(null);
            });
          } else {
            resolve(hostnames && hostnames.length > 0 ? hostnames[0] : null);
          }
        });
      });
      
      return hostname;
    } catch (error) {
      return null;
    }
  }

  // Host-Discovery - Einfach nur Ping (schnell und simpel)
  async discoverHost(ip) {
    try {
      // Ping mit plattformspezifischen Parametern
      const pingOptions = {
        timeout: 3, // 3 Sekunden
        min_reply: 1
      };

      // Windows-spezifische Ping-Parameter
      if (process.platform === 'win32') {
        pingOptions.extra = ['-n', '1', '-w', '3000']; // 3000ms = 3 Sekunden
      } else {
        pingOptions.extra = ['-c', '1', '-W', '3']; // 3 Sekunden
      }

      const pingResult = await ping.promise.probe(ip, pingOptions);
      
      if (pingResult.alive) {
        return { ip, method: 'ping', alive: true };
      }

      return { ip, method: 'ping-failed', alive: false };
    } catch (error) {
      return { ip, method: 'error', alive: false, error: error.message };
    }
  }

  // Port-Scan für einen Host (optimiert)
  async scanPorts(ip) {
    const openPorts = [];
    const portsToScan = Object.keys(this.commonPorts).map(Number);
    
    // Alle Ports parallel scannen mit konfigurierbarem Timeout
    const promises = portsToScan.map(async (port) => {
      try {
        const status = await portscanner.checkPortStatus(port, ip, { 
          timeout: this.config.portScanning.portTimeout 
        });
        if (status === 'open') {
          return {
            port,
            status: 'open',
            service: this.commonPorts[port]
          };
        }
      } catch (err) {
        // Port nicht erreichbar
      }
      return null;
    });
    
    // Alle Port-Scans parallel ausführen
    const results = await Promise.all(promises);
    openPorts.push(...results.filter(result => result !== null));
    
    return openPorts;
  }

  // Gerätetyp basierend auf offenen Ports erraten
  detectDeviceType(openPorts) {
    const portNumbers = openPorts.map(p => p.port);
    
    // Web Server
    if (portNumbers.includes(80) || portNumbers.includes(443)) {
      if (portNumbers.includes(22)) return 'Linux Server';
      if (portNumbers.includes(3389)) return 'Windows Server';
      return 'Web Server';
    }
    
    // Database Server
    if (portNumbers.includes(3306)) return 'MySQL Server';
    if (portNumbers.includes(5432)) return 'PostgreSQL Server';
    if (portNumbers.includes(1433)) return 'MSSQL Server';
    if (portNumbers.includes(27017)) return 'MongoDB Server';
    
    // Network Equipment
    if (portNumbers.includes(161) && portNumbers.includes(23)) return 'Switch';
    if (portNumbers.includes(161) && !portNumbers.includes(80)) return 'Network Device';
    
    // Industrial Equipment
    if (portNumbers.includes(502)) return 'Modbus Device';
    if (portNumbers.includes(102)) return 'Siemens PLC';
    if (portNumbers.includes(44818)) return 'EtherNet/IP Device';
    
    // Remote Access
    if (portNumbers.includes(3389) && !portNumbers.includes(80)) return 'Windows PC';
    if (portNumbers.includes(22) && !portNumbers.includes(80)) return 'Linux PC';
    if (portNumbers.includes(5900)) return 'VNC Server';
    
    // IoT Devices
    if (portNumbers.includes(1883) || portNumbers.includes(8883)) return 'IoT Device';
    
    // Default
    if (portNumbers.length > 0) return 'Unknown Device';
    return 'Host';
  }

  // Vollständiger Netzwerk-Scan mit Parallelisierung
  async scanNetwork(ipRange, progressCallback) {
    try {
      this.scanProgress = {
        totalHosts: 0,
        scannedHosts: 0,
        foundHosts: 0,
        currentOperation: 'Initialisierung...',
        results: []
      };

      // IP-Adressen generieren
      progressCallback && progressCallback({ ...this.scanProgress, currentOperation: 'Generiere IP-Adressen...' });
      const hosts = this.parseNetworkRange(ipRange);
      this.scanProgress.totalHosts = hosts.length;

      progressCallback && progressCallback({ ...this.scanProgress, currentOperation: `${hosts.length} IPs gefunden, starte parallele Host-Discovery...` });

      // Parallele Host-Discovery mit Batches
      const aliveHosts = await this.parallelHostDiscovery(hosts, progressCallback);

      // Parallele Port-Scanning für gefundene Hosts
      const deviceResults = await this.parallelPortScanning(aliveHosts, progressCallback);

      this.scanProgress.currentOperation = `Scan abgeschlossen! ${deviceResults.length} Geräte gefunden.`;
      this.scanProgress.results = deviceResults;
      progressCallback && progressCallback(this.scanProgress);
      
      return deviceResults;
      
    } catch (error) {
      throw new Error(`Netzwerk-Scan Fehler: ${error.message}`);
    }
  }

  // Parallele Host-Discovery
  async parallelHostDiscovery(hosts, progressCallback) {
    const batchSize = this.config.hostDiscovery.batchSize;
    const aliveHosts = [];
    
    for (let i = 0; i < hosts.length; i += batchSize) {
      const batch = hosts.slice(i, i + batchSize);
      this.scanProgress.currentOperation = `Host-Discovery Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(hosts.length/batchSize)} (${batch[0]} - ${batch[batch.length-1]})`;
      
      progressCallback && progressCallback(this.scanProgress);
      
      // Alle Hosts im Batch parallel scannen
      const batchPromises = batch.map(async (ip, index) => {
        const result = await this.discoverHost(ip);
        
        // Progress nach jedem Host aktualisieren
        this.scanProgress.scannedHosts = i + index + 1;
        if (result.alive) {
          this.scanProgress.foundHosts++;
        }
        
        return result;
      });
      
      const batchResults = await Promise.all(batchPromises);
      const aliveBatchHosts = batchResults.filter(host => host.alive);
      aliveHosts.push(...aliveBatchHosts);
      
      // Progress nach dem Batch aktualisieren
      progressCallback && progressCallback(this.scanProgress);
      
      // Konfigurierbare Pause zwischen Batches
      if (i + batchSize < hosts.length) {
        await new Promise(resolve => setTimeout(resolve, this.config.hostDiscovery.batchDelay));
      }
    }
    
    return aliveHosts;
  }

  // Parallele Port-Scanning
  async parallelPortScanning(aliveHosts, progressCallback) {
    const deviceResults = [];
    const concurrentScans = this.config.portScanning.concurrentHosts;
    
    for (let i = 0; i < aliveHosts.length; i += concurrentScans) {
      const batch = aliveHosts.slice(i, i + concurrentScans);
      this.scanProgress.currentOperation = `Port-Scan Batch ${Math.floor(i/concurrentScans) + 1}/${Math.ceil(aliveHosts.length/concurrentScans)} (${batch.map(h => h.ip).join(', ')})`;
      
      progressCallback && progressCallback(this.scanProgress);
      
      // Port-Scans für den Batch parallel ausführen
      const batchPromises = batch.map(async (host) => {
        const [openPorts, hostname] = await Promise.all([
          this.scanPorts(host.ip),
          this.resolveHostname(host.ip)
        ]);
        
        const deviceType = this.detectDeviceType(openPorts);
        
        // Besserer Gerätename basierend auf Hostname oder IP
        let suggestedName;
        if (hostname) {
          // Hostname bereinigen (nur der erste Teil vor dem ersten Punkt)
          const cleanHostname = hostname.split('.')[0];
          suggestedName = cleanHostname;
        } else {
          suggestedName = `${deviceType}-${host.ip.split('.').slice(-1)[0]}`;
        }
        
        return {
          ip: host.ip,
          hostname: hostname || null,
          discoveryMethod: host.method,
          openPorts,
          suggestedDeviceType: deviceType,
          suggestedName: suggestedName,
          portCount: openPorts.length,
          categories: [...new Set(openPorts.map(p => p.service.category))]
        };
      });
      
      const batchResults = await Promise.all(batchPromises);
      deviceResults.push(...batchResults);
      
      // Progress aktualisieren
      this.scanProgress.results = deviceResults;
      progressCallback && progressCallback(this.scanProgress);
      
      // Konfigurierbare Pause zwischen Port-Scan Batches
      if (i + concurrentScans < aliveHosts.length) {
        await new Promise(resolve => setTimeout(resolve, this.config.portScanning.batchDelay));
      }
    }
    
    return deviceResults;
  }

  // Scan-Progress abrufen
  getProgress() {
    return this.scanProgress;
  }
}

module.exports = NetworkScanner;