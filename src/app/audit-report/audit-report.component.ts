import { Component, Input, SimpleChanges } from '@angular/core';
interface Breach{
  cvss?:{score:number,vectorString:string},
  cwe?:string[],
  dependency:string,
  name:string,
  range?:string,
  severity?:Severity,
  source?:number,
  title?:string,
  url?:string
}
interface Vulnerability{
  effects?:[],
  fixAvailable?:{isSemVerMajor:boolean,name:string,version:string},
  isDirect?:boolean,
  name:string,
  nodes:string[],
  range:string,
  severity: Severity,
  via: [Breach]

}
interface AuditReport {
  auditReportVersion?: string, 
  vulnerabilities?: Record<string, Vulnerability>;
  metadata?: { 
    vulnerabilities: { 
      info: number, 
      low: number, 
      moderate: number, 
      high: number, 
      critical: number, 
      total: number 
    }, 
    dependencies?: 
      { prod: number, 
        dev: number, 
        optional: number, 
        peer: number, 
        peerOptional: number, 
        total: number 
      } 
    } 
}

type Severity = 'critical' | 'low' | 'high' | 'moderate';

@Component({
  selector: 'app-audit-report',
  templateUrl: './audit-report.component.html',
})
export class AuditReportComponent {
  @Input() report: AuditReport = {};
  vulns: Record<Severity, Vulnerability[]> = {
    critical: [],
    low: [],
    high: [],
    moderate: [],
  };

  ngOnChanges(changes: SimpleChanges): void {
    const report = changes['report']?.currentValue as AuditReport;

    if (report?.vulnerabilities) {
      this.resetVulnerabilities();

      for (const value of Object.values(report.vulnerabilities)) {
        if (this.isSeverity(value.severity)) {
          this.vulns[value.severity].push(value);
        }
      }
    }
  }

  resetVulnerabilities(): void {
    this.vulns = {
      critical: [],
      low: [],
      high: [],
      moderate: [],
    };
  }

  isSeverity(severity: string): severity is Severity {
    return ['critical', 'low', 'high', 'moderate'].includes(severity);
  }
}
