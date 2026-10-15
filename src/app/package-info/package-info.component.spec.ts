import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { packument, testPackage } from '../../testing/test-data';
import { PackageStore } from '../core/package-store';
import { PackageInfoComponent } from './package-info.component';

describe('PackageInfoComponent', () => {
  let store: PackageStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(PackageStore);
    http = TestBed.inject(HttpTestingController);
    store.load(testPackage);
  });

  async function create(autoPin = true) {
    const fixture = TestBed.createComponent(PackageInfoComponent);
    fixture.componentRef.setInput('entry', store.entries()[0]);
    fixture.componentRef.setInput('autoPin', autoPin);
    // not whenStable(): the pending registry request keeps the app unstable until flushed
    fixture.detectChanges();
    const versions = { '1.0.0': {}, '1.4.2': { peerDependencies: { react: '>=18' } }, '2.0.0': {}, '2.3.0': {}, '3.0.0': {} };
    http.expectOne('https://registry.npmjs.org/foo').flush(packument('foo', versions, '3.0.0'));
    // the parent passes the updated entry after a version change
    fixture.componentRef.setInput('entry', store.entries()[0]);
    await fixture.whenStable();
    return fixture;
  }

  function clickButton(element: HTMLElement, label: string) {
    Array.from(element.querySelectorAll('button'))
      .find((b) => b.textContent?.includes(label))
      ?.click();
  }

  it('pins a version range to the highest matching version', async () => {
    await create();
    expect(store.package()?.dependencies?.['foo']).toBe('1.4.2');
  });

  it('keeps the range when auto pinning is disabled', async () => {
    await create(false);
    expect(store.package()?.dependencies?.['foo']).toBe('^1.0.0');
  });

  it('shows the dependency lists of the selected version', async () => {
    const fixture = await create();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Peer Dependencies');
  });

  it('filters the version list by semver range or text', async () => {
    const fixture = await create();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
    const offered = async (query: string) => {
      input.dispatchEvent(new Event('focusin'));
      input.value = query;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      return Array.from(document.querySelectorAll('mat-option')).map((o) => o.textContent?.trim());
    };

    expect(await offered('2')).toEqual(['2.3.0', '2.0.0']);
    expect(await offered('>=1.4 <3')).toEqual(['2.3.0', '2.0.0', '1.4.2']);
    expect(await offered('.4.')).toEqual(['1.4.2']);
    expect(await offered('nope')).toEqual(['no matching version']);
  });

  it('updates to the next major and to latest', async () => {
    const fixture = await create();
    const element = fixture.nativeElement as HTMLElement;
    clickButton(element, 'Major');
    expect(store.package()?.dependencies?.['foo']).toBe('2.3.0');
    clickButton(element, 'latest');
    expect(store.package()?.dependencies?.['foo']).toBe('3.0.0');
  });
});
