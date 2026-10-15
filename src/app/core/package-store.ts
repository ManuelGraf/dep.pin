import { Injectable, computed, signal } from '@angular/core';
import { Dependencies, PackageJson } from './models';

export type DependencyType = 'dependency' | 'devDependency';

export interface DependencyEntry {
  name: string;
  version: string;
  type: DependencyType;
}

const sectionKeys = {
  dependency: 'dependencies',
  devDependency: 'devDependencies',
} as const satisfies Record<DependencyType, keyof PackageJson>;

function toEntries(deps: Dependencies | undefined, type: DependencyType): DependencyEntry[] {
  return Object.entries(deps ?? {})
    .filter(([, version]) => !version.startsWith('file:'))
    .map(([name, version]) => ({ name, version, type }));
}

/** The package.json currently being edited. Single source of truth for all views. */
@Injectable({ providedIn: 'root' })
export class PackageStore {
  private readonly _package = signal<PackageJson | null>(null);
  private readonly _revision = signal(0);

  readonly package = this._package.asReadonly();
  /** incremented on every edit, used to detect stale audit results */
  readonly revision = this._revision.asReadonly();

  readonly entries = computed<DependencyEntry[]>(() => {
    const pkg = this._package();
    return pkg
      ? [...toEntries(pkg.dependencies, 'dependency'), ...toEntries(pkg.devDependencies, 'devDependency')]
      : [];
  });

  load(pkg: PackageJson): void {
    this._package.set(pkg);
    this._revision.set(0);
  }

  /** sets the version of a direct dependency; unknown (e.g. transitive) packages are ignored */
  setVersion(name: string, version: string): boolean {
    const pkg = this._package();
    const type = this.entries().find((entry) => entry.name === name)?.type;
    if (!pkg || !type || pkg[sectionKeys[type]]?.[name] === version) {
      return false;
    }
    const key = sectionKeys[type];
    this._package.set({ ...pkg, [key]: { ...pkg[key], [name]: version } });
    this._revision.update((r) => r + 1);
    return true;
  }

  addDependency(name: string, version: string): void {
    const pkg = this._package();
    if (!pkg || this.entries().some((entry) => entry.name === name)) {
      return;
    }
    this._package.set({ ...pkg, dependencies: { ...pkg.dependencies, [name]: version } });
    this._revision.update((r) => r + 1);
  }
}
