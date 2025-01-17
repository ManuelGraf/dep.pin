import { Component, Input, SimpleChanges } from '@angular/core';
import { DependencyService } from '../core/services/dependency.service';
export interface Breach{
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
export interface Vulnerability{
  effects?:[],
  fixAvailable?:{isSemVerMajor:boolean,name:string,version:string},
  isDirect?:boolean,
  name:string,
  nodes:string[],
  range:string,
  severity: Severity,
  via: [Breach]

}
export interface AuditReport {
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

export type Severity = 'critical' | 'low' | 'high' | 'moderate';

@Component({
  selector: 'app-audit-report',
  templateUrl: './audit-report.component.html',
  styleUrls: ['./audit-report.component.scss'],

})
export class AuditReportComponent {
  @Input() report?: AuditReport = {};
  vulns: Record<Severity, Vulnerability[]> = {
    critical: [],
    low: [],
    high: [],
    moderate: [],
  };
  constructor(private dependencyService:DependencyService){}

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
  fixAll(){
    console.log('implemnt me');
  }
  resetVulnerabilities(): void {
    this.vulns = {
      critical: [],
      low: [],
      high: [],
      moderate: [],
    };
  }

  fixVersion(name:string,version:string){
    console.log('fix version',name,version)
    this.dependencyService.setPackageVersionSelection$.next({name,version});
  }

  isSeverity(severity: string): severity is Severity {
    return ['critical', 'low', 'high', 'moderate'].includes(severity);
  }
}
