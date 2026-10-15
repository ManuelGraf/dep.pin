import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import * as semver from 'semver';
import { PackageJson, PackageVersionsResponse } from './models';

/** Access to the npm registry, with an in-memory cache per package */
@Injectable({ providedIn: 'root' })
export class DependencyService {
  private readonly http = inject(HttpClient);
  private readonly requests = new Map<string, Observable<PackageVersionsResponse>>();
  /** registry responses loaded so far; a signal so templates update when data arrives */
  private readonly cache = signal<Record<string, PackageVersionsResponse>>({});

  getPackageVersions(packageName: string): Observable<PackageVersionsResponse> {
    let request = this.requests.get(packageName);
    if (!request) {
      request = this.http.get<PackageVersionsResponse>(`https://registry.npmjs.org/${packageName}`).pipe(
        tap((response) => this.cache.update((cache) => ({ ...cache, [packageName]: response }))),
        shareReplay(1),
      );
      this.requests.set(packageName, request);
    }
    return request;
  }

  /** the package.json of the highest cached version satisfying the range */
  getPackageVersion(name: string, versionRange: string): PackageJson | undefined {
    const versions = this.cache()[name]?.versions;
    if (!versions) {
      return undefined;
    }
    const suitable = semver.maxSatisfying(Object.keys(versions), versionRange);
    return suitable ? versions[suitable] : undefined;
  }

  /** all cached versions of a package, newest first */
  getAvailableVersions(name: string): string[] {
    return sortVersionsDescending(Object.keys(this.cache()[name]?.versions ?? {}));
  }

  getLatestVersion(name: string): string | undefined {
    const response = this.cache()[name];
    return response?.['dist-tags']?.['latest'] ?? this.getAvailableVersions(name)[0];
  }
}

export function sortVersionsDescending(versions: string[]): string[] {
  return versions.filter((v) => semver.valid(v)).sort((a, b) => semver.rcompare(a, b));
}
