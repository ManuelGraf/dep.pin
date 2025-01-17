import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import * as semver from 'semver';

export interface Dependencies {
  [key: string]: string;
}
export interface PackageVersionsResponse {
  "_id": string;
  "_rev": string;
  name: string;
  description: string;
  versions?: { [key: string]: PackageJson };
  keywords?: string;
  author?: string;
}
export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Dependencies;
  devDependencies?: Dependencies;
  peerDependencies?: Dependencies;
}

@Injectable({
  providedIn: 'root',
})
export class DependencyService {
  private cache: { [key: string]: PackageVersionsResponse } = {};
  private subjects: { [key: string]: ReplaySubject<PackageVersionsResponse> } = {};
  /**
   * Used to change the selected version in dependency manager from the outside
   */
  public setPackageVersionSelection$ = new Subject<{name:string,version:string}>();
  

  constructor(private http: HttpClient) {}

  getPackageVersions(packageName: string): Observable<PackageVersionsResponse> {
    // Return the same subject if it already exists
    if (this.subjects[packageName]) {
      return this.subjects[packageName].asObservable();
    }

    // Create a new ReplaySubject for the package
    const subject = new ReplaySubject<PackageVersionsResponse>(1);
    this.subjects[packageName] = subject;

    // If the package is cached, emit it and complete the subject
    if (this.cache[packageName]) {
      subject.next(this.cache[packageName]);
      subject.complete();
    } else {
      // Otherwise, fetch from the registry and cache the result
      this.http.get<PackageVersionsResponse>(`https://registry.npmjs.org/${packageName}`)
        .pipe(
          map((response) => {
            this.cache[packageName] = response; // Cache the response
            return response;
          })
        )
        .subscribe({
          next: (response) => {
            subject.next(response); // Emit the response to the subject
            subject.complete(); // Complete the subject
          },
          error: (err) => {
            console.error('Error fetching package versions for', packageName, err);
            subject.error(err); // Pass the error to subscribers
          },
        });
    }

    return subject.asObservable();
  }

  getPackageVersion(name: string, versionRange: string): PackageJson | undefined {
    const versions = this.cache[name]?.versions;
    if (versions) {
      const suitable = semver.maxSatisfying(Object.keys(versions), versionRange);
      return versions[suitable || ''];
    }
    return undefined;
  }

  getAvailableVersionsListFromCache(name: string): string[]|null {
    const versions = this.cache[name];
    if (versions && versions.versions)
      return Object.keys(versions.versions).sort((a, b) => semver.rcompare(a, b));
    return null

  }

  findMostSuitableVersionFromList(
    availableVersions: string[],
    versionRange: string
  ): string | null {
    const suitableVersions = availableVersions.filter((version) =>
      semver.satisfies(version, versionRange)
    );
    const mostSuitableVersion = semver.maxSatisfying(
      suitableVersions,
      versionRange
    );
    return mostSuitableVersion || null;
  }


  parsePackageJson(fileContent: string): object {
    return JSON.parse(fileContent) as object;
  }
}
