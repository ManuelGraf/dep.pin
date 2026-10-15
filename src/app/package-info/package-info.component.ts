import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { tap } from 'rxjs';
import * as semver from 'semver';
import { DependencyService, sortVersionsDescending } from '../core/dependency.service';
import { PackageVersionsResponse } from '../core/models';
import { DependencyEntry, PackageStore } from '../core/package-store';

type DependencyListType = 'dependencies' | 'devDependencies' | 'peerDependencies';

interface DependencyList {
  type: DependencyListType;
  label: string;
  items: { name: string; version: string }[];
}

const listLabels: Record<DependencyListType, string> = {
  dependencies: 'Dependencies',
  devDependencies: 'Dev Dependencies',
  peerDependencies: 'Peer Dependencies',
};

@Component({
  selector: 'app-package-info',
  imports: [
    MatAutocompleteModule,
    MatButtonModule,
    MatChipsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinner,
  ],
  templateUrl: './package-info.component.html',
  styleUrl: './package-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackageInfoComponent {
  private readonly dependencyService = inject(DependencyService);
  private readonly store = inject(PackageStore);

  readonly entry = input.required<DependencyEntry>();
  /** pins a version range (e.g. ^1.2.0) to the highest matching exact version once versions are loaded */
  readonly autoPin = input(true);

  protected readonly packument = rxResource({
    params: () => this.entry().name,
    stream: ({ params: name }) =>
      this.dependencyService.getPackageVersions(name).pipe(tap((response) => this.pinVersion(response))),
  });

  protected readonly availableVersions = computed(() =>
    sortVersionsDescending(Object.keys(this.packument.value()?.versions ?? {})),
  );

  /** text typed into the version field, null while not filtering */
  protected readonly versionQuery = signal<string | null>(null);

  /** semver ranges (e.g. `17`, `^2.1`, `>=1.4 <2`) filter by range, anything else by text */
  protected readonly filteredVersions = computed(() => {
    const versions = this.availableVersions();
    const query = this.versionQuery()?.trim();
    if (!query) {
      return versions;
    }
    if (semver.validRange(query)) {
      return versions.filter((v) => semver.satisfies(v, query, { includePrerelease: true }));
    }
    const lower = query.toLowerCase();
    return versions.filter((v) => v.toLowerCase().includes(lower));
  });

  protected readonly dependencyLists = computed<DependencyList[]>(() => {
    const { name, version } = this.entry();
    // reading packument.value() makes this recompute once the registry data arrived
    this.packument.value();
    const info = this.dependencyService.getPackageVersion(name, version);
    return (['dependencies', 'devDependencies', 'peerDependencies'] as const)
      .map((type) => ({
        type,
        label: listLabels[type],
        items: Object.entries(info?.[type] ?? {}).map(([name, version]) => ({ name, version })),
      }))
      .filter((list) => list.items.length > 0);
  });

  protected setVersion(version: string | null | undefined): void {
    if (version) {
      this.store.setVersion(this.entry().name, version);
    }
  }

  /** shows the current version again when the version list closes without a selection */
  protected resetVersionInput(input: HTMLInputElement): void {
    this.versionQuery.set(null);
    input.value = this.store.entries().find((e) => e.name === this.entry().name)?.version ?? this.entry().version;
  }

  /** highest version within the current minor (~) */
  protected updatePatch(): void {
    this.setVersion(this.maxSatisfying('~'));
  }

  /** highest version within the current major (^) */
  protected updateMinor(): void {
    this.setVersion(this.maxSatisfying('^'));
  }

  /** highest version of the next major */
  protected updateMajor(): void {
    const current = semver.minVersion(this.entry().version);
    if (!current) {
      return;
    }
    const nextMajors = this.availableVersions().filter((v) => semver.major(v) > current.major);
    if (nextMajors.length) {
      const nextMajor = Math.min(...nextMajors.map((v) => semver.major(v)));
      this.setVersion(semver.maxSatisfying(nextMajors, `${nextMajor}.x`));
    }
  }

  protected updateLatest(): void {
    this.setVersion(this.dependencyService.getLatestVersion(this.entry().name));
  }

  private maxSatisfying(operator: '~' | '^'): string | null {
    const current = semver.minVersion(this.entry().version);
    return current ? semver.maxSatisfying(this.availableVersions(), `${operator}${current.version}`) : null;
  }

  private pinVersion(response: PackageVersionsResponse): void {
    if (!this.autoPin()) {
      return;
    }
    const versions = Object.keys(response.versions ?? {});
    this.setVersion(semver.maxSatisfying(versions, this.entry().version));
  }
}
