import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { testPackage } from '../../../testing/test-data';
import { DesktopService } from '../../core/desktop.service';
import { DependencyManagerComponent } from './dependency-manager.component';

describe('DependencyManagerComponent', () => {
  const desktop = {
    audit: vi.fn(),
    checkUpdates: vi.fn(),
  };

  beforeEach(() => {
    desktop.audit.mockResolvedValue({ vulnerabilities: {} });
    desktop.checkUpdates.mockResolvedValue({});
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: DesktopService, useValue: desktop }],
    });
  });

  it('asks for a package.json initially', async () => {
    const fixture = TestBed.createComponent(DependencyManagerComponent);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('drag & drop a valid package.json');
  });

  it('loads a selected file and runs audit and update check', async () => {
    const fixture = TestBed.createComponent(DependencyManagerComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    const input = element.querySelector<HTMLInputElement>('input[type=file]')!;
    const file = new File([JSON.stringify(testPackage)], 'package.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(desktop.audit).toHaveBeenCalled());
    await fixture.whenStable();

    expect(desktop.checkUpdates).toHaveBeenCalled();
    expect(element.textContent).toContain('test-app');
    expect(element.textContent).toContain('foo');
  });
});
