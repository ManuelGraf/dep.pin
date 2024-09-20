import { Component, Input } from '@angular/core';
interface AuditReport {
  auditReportVersion?: string, 
  vulnerabilities?: {
    info: any, 
    low: any, 
    moderate: any, 
    high: any, 
    critical: any, 
    total: any 
  }, 
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

@Component({
  selector: 'app-audit-report',
  templateUrl: './audit-report.component.html',
  styleUrl: './audit-report.component.scss'
})
export class AuditReportComponent {
  @Input() report:AuditReport = {};
  
}
