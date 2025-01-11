import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import * as semver from 'semver';
import { DependencyService, PackageJson } from '../core/services/dependency.service';

@Component({
  selector: 'app-package-info',
  templateUrl: './package-info.component.html',
  styleUrl: './package-info.component.scss',
})
export class PackageInfoComponent {
  constructor(private dependencyService: DependencyService) {}
  @Input() dep!: FormGroup; // Receive the FormGroup for this dependency, has name, version, loading
  @Input() autopin: Boolean = true; // Receive the FormGroup for this dependency, has name, version, loading
  @Input() name!: string; // Receive the name for this dependency
  @Output() versionChange = new EventEmitter<{ dep: FormGroup; event: any }>();
  @Output() updateVersion = new EventEmitter<{
    dep: FormGroup;
    type: string;
  }>();
  get versionControl() {
    return this.dep.get('version') as FormControl;
  }
  get version(): string | null {
    return this.dep.get('version')?.value as string ?? null;
  }
  set version(v) {
    this.dep.get('version')?.setValue(v);
  }

  availableVersions: string[] = [];
  isLoading = true;
  destroyed$ = new Subject();
  autoPin = true;

  ngOnInit(): void {
    console.log(`Init Info for ${this.name}`);
    this.isLoading = true;
    this.dependencyService
      .getPackageVersions(this.name)
      .pipe(takeUntil(this.destroyed$))
      .subscribe((versions) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        if (versions && versions.versions) {
          this.onPackageVersions(versions.versions)
        }
      });
  }
  onPackageVersions(versions:{ [key: string]: PackageJson; } | null) {
    this.isLoading = false; 
    if(versions){
      this.availableVersions = Object.keys(versions).sort((a, b) =>
        semver.rcompare(a, b)
      );
      if(this.autoPin){
          const mostsuitableFixedVersion = this.dependencyService.findMostSuitableVersionFromList(
            this.availableVersions || [],
            this.version || ''
          );
          this.version = mostsuitableFixedVersion;
      }
    }
  }

  updatePatch(ctrl: FormControl) {
    const versionControl = ctrl.get('version');
    const currentVersion = versionControl?.value;
    if (this.availableVersions && this.availableVersions.length) {
      const validVersions = this.availableVersions?.filter(
        (v) => semver.valid(v) && semver.satisfies(v, `~${currentVersion}`)
      );
      const highestPatch = semver.maxSatisfying(
        validVersions,
        `~${versionControl?.value}`
      );
      versionControl?.setValue(highestPatch || null,{ emitEvent: true });
      // this.onVersionChange(ctrl,null);
    }
  }
  updateMinor(ctrl: AbstractControl) {
    const versionControl = ctrl.get('version');

    const currentVersion = versionControl?.value;

    if (this.availableVersions && this.availableVersions.length) {
      const validVersions = this.availableVersions.filter(
        (v) => semver.valid(v) && semver.satisfies(v, `^${currentVersion}`)
      );
      const highestMinor = semver.maxSatisfying(
        validVersions,
        `^${currentVersion}`
      );
      versionControl?.setValue(highestMinor || null,{ emitEvent: true });

    }
  }
  updateLatest(ctrl: AbstractControl) {
    const versionControl = ctrl.get('version');

    const currentVersion = versionControl?.value;
    if (this.availableVersions && this.availableVersions.length) {
      const sortedVersions = this.availableVersions.sort(semver.rcompare);
      versionControl?.setValue(sortedVersions[0] || currentVersion,{ emitEvent: true });

    }
  }
  /**
   * updates a control to the next major version, latest
   * @param versionControl the FormArray containing version and name
   * @param availableVersions
   * @returns
   */
  updateMajor(ctrl: AbstractControl) {
    const name = ctrl.get('name')?.value;
    const versionControl = ctrl.get('version');
    const currentVersion = versionControl?.value;
    const currentMajor = semver.major(currentVersion);
    if (this.availableVersions && this.availableVersions.length) {
      const nextMajorVersions = this.availableVersions.filter(
        (v) => semver.valid(v) && semver.major(v) > currentMajor
      );

      if (nextMajorVersions.length === 0) {
        return null;
      }
      const nextMajor = Math.min(
        ...nextMajorVersions.map((v) => semver.major(v))
      );
      const validNextMajorVersions = nextMajorVersions.filter(
        (v) => semver.major(v) === nextMajor
      );
      const highestNextMajorVersion = semver.maxSatisfying(
        validNextMajorVersions,
        '*'
      );
      versionControl?.setValue(highestNextMajorVersion,{ emitEvent: true });
    }
  }

  onVersionChange(event: any): void {
    this.versionChange.emit({ dep: this.dep, event });
  }

  update(type: string): void {
    this.updateVersion.emit({ dep: this.dep, type });
  }

  peerDepCount(name: string, version: string) {
    return this.getDepsList(name, version,'peerDependencies').length;
  }
  depCount(name: string, version: string) {
    return this.getDepsList(name, version,'dependencies').length;
  }
  devDepCount(name: string, version: string) {
    return this.getDepsList(name, version,'devDependencies').length;
  }

  getDepsList(name: string, version: string,type:'peerDependencies'|'dependencies'|'devDependencies'="peerDependencies") {
    const info = this.dependencyService.getPackageVersion(name, version);
    const arr: PackageJson[] = [];
    if (info && info[type]) {
      Object.keys(info?.[type] || {}).forEach((key:string,index:number) => {
        arr.push({
          name: key,
          version: info?.[type]?.[key]
        });
      });
    }
    return arr;
  }


  ngOnDestroy(): void {
    console.log('destroyed info for', this.name)
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.destroyed$.next(true);
  }
}
