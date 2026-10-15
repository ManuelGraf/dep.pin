import { TestBed } from '@angular/core/testing';
import { testPackage } from '../../testing/test-data';
import { PackageStore } from './package-store';

describe('PackageStore', () => {
  let store: PackageStore;

  beforeEach(() => {
    store = TestBed.inject(PackageStore);
    store.load(testPackage);
  });

  it('lists dependencies and devDependencies, without local file dependencies', () => {
    expect(store.entries()).toEqual([
      { name: 'foo', version: '^1.0.0', type: 'dependency' },
      { name: 'bar', version: '~2.1.0', type: 'devDependency' },
    ]);
  });

  it('updates the version in the matching section', () => {
    expect(store.setVersion('bar', '2.1.5')).toBe(true);
    expect(store.package()?.devDependencies).toEqual({ bar: '2.1.5' });
    expect(store.package()?.dependencies?.['foo']).toBe('^1.0.0');
    expect(store.revision()).toBe(1);
  });

  it('does not modify the loaded object', () => {
    store.setVersion('foo', '1.2.3');
    expect(testPackage.dependencies?.['foo']).toBe('^1.0.0');
  });

  it('ignores unknown packages and unchanged versions', () => {
    expect(store.setVersion('transitive', '1.0.0')).toBe(false);
    expect(store.setVersion('foo', '^1.0.0')).toBe(false);
    expect(store.revision()).toBe(0);
  });

  it('adds new dependencies', () => {
    store.addDependency('baz', '3.0.0');
    expect(store.package()?.dependencies?.['baz']).toBe('3.0.0');
    expect(store.entries().map((e) => e.name)).toContain('baz');
  });
});
