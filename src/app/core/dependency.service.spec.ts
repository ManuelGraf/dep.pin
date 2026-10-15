import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { packument } from '../../testing/test-data';
import { DependencyService } from './dependency.service';

describe('DependencyService', () => {
  let service: DependencyService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DependencyService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests each package from the registry only once', () => {
    const results: string[] = [];
    service.getPackageVersions('foo').subscribe((r) => results.push(r.name));
    service.getPackageVersions('foo').subscribe((r) => results.push(r.name));
    http.expectOne('https://registry.npmjs.org/foo').flush(packument('foo'));
    service.getPackageVersions('foo').subscribe((r) => results.push(r.name));
    expect(results).toEqual(['foo', 'foo', 'foo']);
  });

  it('resolves versions from the cache', () => {
    service.getPackageVersions('foo').subscribe();
    http
      .expectOne('https://registry.npmjs.org/foo')
      .flush(packument('foo', { '1.0.0': {}, '1.2.0': { name: 'foo', version: '1.2.0' }, '2.0.0': {}, 'bad': {} }, '2.0.0'));

    expect(service.getAvailableVersions('foo')).toEqual(['2.0.0', '1.2.0', '1.0.0']);
    expect(service.getPackageVersion('foo', '^1.0.0')).toEqual({ name: 'foo', version: '1.2.0' });
    expect(service.getLatestVersion('foo')).toBe('2.0.0');
    expect(service.getPackageVersion('unknown', '*')).toBeUndefined();
  });
});
