import { TestBed } from '@angular/core/testing';
import { testPackage } from '../../testing/test-data';
import { AuditReport } from '../core/models';
import { PackageStore } from '../core/package-store';
import { AuditReportComponent } from './audit-report.component';

const report: AuditReport = {
  vulnerabilities: {
    foo: {
      name: 'foo',
      severity: 'high',
      isDirect: true,
      range: '<1.5.0',
      nodes: [],
      via: [{ name: 'foo', dependency: 'foo', title: 'Prototype pollution', url: 'https://example.com' }],
      fixAvailable: { name: 'foo', version: '1.5.0', isSemVerMajor: false },
    },
    deep: { name: 'deep', severity: 'moderate', range: '*', nodes: [], via: ['foo'], fixAvailable: true },
  },
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 1, high: 1, critical: 0, total: 2 } },
};

describe('AuditReportComponent', () => {
  async function create() {
    const fixture = TestBed.createComponent(AuditReportComponent);
    fixture.componentRef.setInput('report', report);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders one panel per severity', async () => {
    const titles = Array.from((await create()).querySelectorAll('mat-panel-title strong')).map((e) => e.textContent);
    expect(titles).toEqual(['Critical', 'High', 'Moderate', 'Low']);
  });

  it('applies all concrete fixes to the package', async () => {
    const store = TestBed.inject(PackageStore);
    store.load(testPackage);
    const element = await create();
    const fixAll = Array.from(element.querySelectorAll('button')).find((b) => b.textContent?.includes('Fix All'));
    fixAll?.click();
    expect(store.package()?.dependencies?.['foo']).toBe('1.5.0');
  });
});
