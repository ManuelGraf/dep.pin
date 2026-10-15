import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { AuditReport, Breach, Severity, Vulnerability } from '../core/models';
import { PackageStore } from '../core/package-store';

export interface Fix {
  name: string;
  version: string;
}

interface SeverityGroup {
  severity: Severity;
  label: string;
  count: number;
  vulnerabilities: Vulnerability[];
}

const severities: { severity: Severity; label: string }[] = [
  { severity: 'critical', label: 'Critical' },
  { severity: 'high', label: 'High' },
  { severity: 'moderate', label: 'Moderate' },
  { severity: 'low', label: 'Low' },
];

@Component({
  selector: 'app-audit-report',
  imports: [MatButtonModule, MatCardModule, MatExpansionModule, MatIconModule],
  templateUrl: './audit-report.component.html',
  styleUrl: './audit-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditReportComponent {
  private readonly store = inject(PackageStore);

  readonly report = input.required<AuditReport>();

  protected readonly groups = computed<SeverityGroup[]>(() => {
    const report = this.report();
    const vulnerabilities = Object.values(report.vulnerabilities ?? {});
    return severities.map(({ severity, label }) => ({
      severity,
      label,
      count: report.metadata?.vulnerabilities[severity] ?? 0,
      vulnerabilities: vulnerabilities.filter((v) => v.severity === severity),
    }));
  });

  protected readonly fixes = computed(() =>
    Object.values(this.report().vulnerabilities ?? {})
      .map((v) => this.fixOf(v))
      .filter((fix) => !!fix),
  );

  /** the concrete version that fixes a vulnerability; `fixAvailable: true` means a fix through transitive updates only */
  protected fixOf(vulnerability: Vulnerability): Fix | null {
    const fix = vulnerability.fixAvailable;
    return typeof fix === 'object' ? { name: fix.name, version: fix.version } : null;
  }

  protected asBreach(via: Breach | string): Breach | null {
    return typeof via === 'object' ? via : null;
  }

  protected applyFix(fix: Fix): void {
    this.store.setVersion(fix.name, fix.version);
  }

  protected fixAll(): void {
    this.fixes().forEach((fix) => this.applyFix(fix));
  }
}
