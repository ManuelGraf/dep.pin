import { TestBed } from '@angular/core/testing';
import { testPackage } from '../../testing/test-data';
import { PackageStore } from '../core/package-store';
import { UpdateReportComponent } from './update-report.component';

describe('UpdateReportComponent', () => {
  it('lists pending updates and hides applied ones', async () => {
    const store = TestBed.inject(PackageStore);
    store.load(testPackage);
    const fixture = TestBed.createComponent(UpdateReportComponent);
    fixture.componentRef.setInput('package', store.package());
    fixture.componentRef.setInput('report', { foo: '^2.0.0', bar: '~2.2.0' });
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('mat-row').length).toBe(2);
    // only foo is a major update
    expect(element.querySelectorAll('.major-update').length).toBe(1);

    store.setVersion('foo', '^2.0.0');
    fixture.componentRef.setInput('package', store.package());
    await fixture.whenStable();
    expect(element.querySelectorAll('mat-row').length).toBe(1);
  });
});
