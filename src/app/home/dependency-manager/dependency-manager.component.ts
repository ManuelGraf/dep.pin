/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { DOCUMENT } from '@angular/common';
import { Component, Inject, inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { firstValueFrom, map, Subject, takeUntil } from 'rxjs';
import * as semver from 'semver';
import { AuditReport } from '../../audit-report/audit-report.component';
import { ClipboardService } from '../../clipboard.service';
import { ElectronService } from '../../core/services';
import {
  Dependencies,
  DependencyService,
  PackageJson,
} from '../../core/services/dependency.service';
import { StateService } from '../../state.service';
import { UpdateReport } from '../../update-report/update-report.component';
// Define the structure of dependencies and package.json

@Component({
  selector: 'app-dependency-manager',
  templateUrl: './dependency-manager.component.html',
  styleUrls: ['./dependency-manager.component.scss'],
})
export class DependencyManagerComponent implements OnInit {
  dependenciesForm!: FormGroup;
  errorMessages: string[] = [];
  isLoading = false;
  isAuditRunning = false;
  package: PackageJson | null = null;
  showPackage: boolean = false;
  auditResults?: AuditReport;
  auditErrors?: any;
  updateResults?: UpdateReport;
  updateErrors?: any;
  cancelSubscriptions$ = new Subject<any>();
  readonly dialog = inject(MatDialog);
  dialogRef: any;
  isFileDraggedOver: boolean = false;
  get stateAction(){
    return this.state.getCurrentAction()
  }

  constructor(
    private fb: FormBuilder,
    public dependencyService: DependencyService,
    private electron: ElectronService,
    private snackBar: MatSnackBar,
    private router: Router,
    private clipboard: ClipboardService,
    public state:StateService,
    @Inject(DOCUMENT) private document: Document
  ) {
    (window as any).form = this.dependenciesForm;
  }

  ngOnInit(): void {
    this.document.addEventListener('dragover',this.onDragOver.bind(this))
    this.document.addEventListener('drop',this.onDrop.bind(this))
    this.dependenciesForm = this.fb.group({
      dependencies: this.fb.array([]),
      // devDependencies: this.fb.array([],peerDependencyValidator()),
    });
    // some outside component wants to change selected version
    this.dependencyService.setPackageVersionSelection$
      .pipe(takeUntil(this.cancelSubscriptions$))
      .subscribe((versionInfo) => {
        if (this.package && this.dependenciesForm.get('dependencies')) {
          for (const dep of (
            this.dependenciesForm.get('dependencies') as FormArray
          ).controls) {
            if (dep.get('name')?.value === versionInfo.name) {
              dep.get('version')?.setValue(versionInfo.version);
              console.log('external component changed version:', versionInfo);
              this.updatePackageJson();
            }
          }
        }
      });
    (window as any).deps = this.dependenciesForm.get('dependencies');
  }
  setState(state: string) {
    this.state.info(state);
  }

  get countDependencies() {
    return Object.keys(this.package?.dependencies || {}).length;
  }
  get countDevDependencies() {
    return Object.keys(this.package?.devDependencies || {}).length;
  }

  onFileSelected(event: any): void {
    this.isLoading = true;
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          this.onPackageLoaded(e);
        } catch (error) {
          this.snackBar.open('Invalid package.json file', 'Close', {
            duration: 3000,
          });
        }
      };
      reader.readAsText(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.items) {
      const isJson = Array.from(event.dataTransfer.items).some(
        (item) => item.kind === 'file' && item.type === 'application/json'
      );
      console.log(isJson);
      if (!isJson) {
        this.state.start('Invalid file type detected');
        this.isFileDraggedOver = false;
      } else {
        this.state.end('Invalid file type detected');
        this.isFileDraggedOver = true;
      }
    }
  }
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isFileDraggedOver) {
      this.isFileDraggedOver = false;
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer?.files.length) {
        const file = event.dataTransfer.files[0];
        if (file.type === 'application/json') {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            try {
              this.onPackageLoaded(e);
            } catch (error) {
              this.snackBar.open('Invalid package.json file', 'Close', {
                duration: 3000,
              });
            }
          };
          reader.readAsText(file);
        } else {
          this.snackBar.open('Please drop a valid package.json file', 'Close', {
            duration: 3000,
          });
        }
      }
    }
  }
  onPackageLoaded(e: any) {
    const packageJson: PackageJson = JSON.parse(e.target.result);
    this.package = packageJson;
    this.clearDependencies();
    this.addDependencies(packageJson.dependencies || {}, 'dependency');
    this.addDependencies(packageJson.devDependencies || {}, 'devDependency');
    this.state.clear();
    this.setState('package.json loaded.')
    this.isLoading = false;
    this.snackBar.open('package loaded', 'Close', {
      duration: 5000,
      panelClass: ['snackbar'],
    });
    this.audit();
    this.update();
  }

  // async updatePeerDependencies(formGroup:AbstractControl){
  //   return new Promise((resolve,reject) =>{
  //     this.getPeerDependencies(formGroup.get('name')?.value,formGroup.get('version')?.value).then(peerDeps =>{
  //       if(!peerDeps) reject('no peerdeps found');
  //       formGroup.get('peerDependencies')?.setValue(peerDeps,{emitEvent:false,onlySelf:true});
  //       console.log('updated peerdeps for ',formGroup.get('name')?.value,peerDeps)
  //       resolve(peerDeps);
  //     }).catch(()=>reject('error getting per dependencies'));
  //   })
  // }

  clearDependencies() {
    const formArray = this.dependenciesForm.get('dependencies') as FormArray;
    formArray.clear();
  }
  addDependencies(dependencies: Dependencies, type: string): void {
    const formArray = this.dependenciesForm.get('dependencies') as FormArray;
    Object.keys(dependencies).forEach((dep) => {
      this.addDependency(dep, dependencies[dep], formArray, type);
    });
    // formArray.updateValueAndValidity();
  }

  addDependency(
    name: string,
    version: string,
    formArray: FormArray,
    type: string
  ) {
    const dependencyGroup = this.fb.group(
      {
        name: [name],
        version: [version],
        type: [type],
      },
      { validators: [], updateOn: 'blur' }
    );
    if (version.includes('file:')) return;
    formArray.push(dependencyGroup);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    // let versions = await lastValueFrom( this.dependencyService.getPackageVersions(name));
    // this.dependencyService.addToCache(name,versions);
  }

  // async getPeerDependencies(name:string,version:string){
  //   const ret = await this.dependencyService.getPackageVersionInfo(name,version);
  //   return ret?.peerDependencies || {};
  // }

  onVersionChange(dep: FormControl, evt: any) {
    console.log('version change', dep.value, evt);
    setTimeout(() => {
      this.updatePackageJson();
      this.auditResults = {};
      this.auditErrors = {};
    });
  }
  validatePeerDeps(peerDeps: any) {
    if (!Object.keys(peerDeps).length) return [];
    const issues: string[] = [];
    Object.entries(peerDeps).forEach(([peerName, peerVersion]) => {
      let hasPeerDep = false;
      const all = this.dependenciesForm.get('dependencies') as FormArray;
      all.controls.forEach((ctrl: AbstractControl) => {
        if (peerName === ctrl.get('name')?.value) {
          hasPeerDep = true;
          if (
            !semver.satisfies(ctrl.get('version')?.value, peerVersion as string)
          ) {
            issues.push(
              `Peer Dependency not met: ${
                ctrl.get('name')?.value
              } requires ${peerVersion} but found ${
                ctrl.get('version')?.value
              }.\n`
            );
          }
        }
      });
      if (!hasPeerDep)
        issues.push(`peer dependency missing: ${peerName} @ ${peerVersion}\n`);
    });
    return issues;
  }

  versionValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const name = control.get('name')?.value;
      const version = control.get('version')?.value;
      const peerdeps = this.dependencyService.getPackageVersion(
        name,
        version
      )?.peerDependencies;
      if (peerdeps) {
        const errors = this.validatePeerDeps(peerdeps);
        if (errors && errors.length) {
          console.log('validation errors! ', errors);
          // control.get('version')?.setErrors(errors);
          // control.get('version')?.markAsTouched();

          return { unmetPeerDependencies: errors.join('') };
        }
      }
      return null;
    };
  }
  updateAndValidatePeerDependencies(control: AbstractControl) {
    const peerDeps = this.dependencyService.getPackageVersion(
      control.get('name')?.value,
      control.get('version')?.value
    )?.peerDependencies;
    const peerDepErrors = this.validatePeerDeps(peerDeps);
    if (peerDepErrors.length > 0) {
      return peerDepErrors.join(', ');
    }
    return null;
  }
  jumpToDep(evt: string | null) {
    console.log(evt);
    this.router.navigate([], { fragment: evt || '' });
  }
  getAvailableVersionsList(name: string) {
    return this.dependencyService.getPackageVersions(name).pipe(
      map((versions) => {
        if (versions && versions.versions)
          return Object.keys(versions.versions).sort((a, b) =>
            semver.rcompare(a, b)
          );
      })
    );
  }
  updatePackageJson() {
    this.state.start('update Package Json');
    for (const dep of (this.dependenciesForm.get('dependencies') as FormArray)
      .controls) {
      const name = dep.get('name')?.value;
      const version = dep.get('version')?.value;
      const type = dep.get('type')?.value;
      console.log(
        this.package?.dependencies,
        this.package?.devDependencies,
        name,
        version,
        type
      );
      switch (type) {
        case 'dependency':
          if (this.package?.dependencies?.hasOwnProperty(name))
            this.package.dependencies[name] = version;
          break;
          case 'devDependency':
            if (this.package?.devDependencies?.hasOwnProperty(name))
              this.package.devDependencies[name] = version;
            break;
          }
        }
        this.state.end('update Package Json');
        
        console.log('updated json', JSON.stringify(this.package));
      }
      getDepForm(): FormArray {
        return this.dependenciesForm.get('dependencies') as FormArray;
      }
      copyJsonToClipboard() {
    this.clipboard.copyToClipboard(this.package);
    this.snackBar.open('coped to Clipboard', 'close', {
      duration: 1000,
    });
  }
  async onPackageAdded(name: any) {
    const available = await firstValueFrom(this.getAvailableVersionsList(name));
    if (available) {
      const latest = available[0];
      this.addDependency(
        name.name,
        latest,
        this.dependenciesForm.get('dependencies') as FormArray,
        'dependencies'
      );
      console.log('package added', name, latest);
    }
  }
  async audit() {
    console.log('audit start');
    this.state.start('npm audit is running...')
    this.isAuditRunning = true;
    this.auditErrors = null;
    this.isLoading = true;
    this.auditResults = undefined;
    try {
      this.auditResults = await this.electron.runNpmAuditWithJson(this.package);
    } catch (e) {
      this.auditErrors = e;
      console.warn(e);
    }
    this.isLoading = false;
    console.log('audit end', this.auditResults);
    this.state.end('npm audit is running...')
    this.isAuditRunning = false;
  }
  update() {
    this.isLoading = true;
    this.updateResults = undefined;
    this.updateErrors = null;
    this.state.start('checking for updates...')
    
    this.electron
    .runNpmCheckUpdates(this.package)
    .then((result) => {
      this.updateResults = result;
      this.isLoading = false;
      this.state.end('checking for updates...')
    })
    .catch((e) => {
      this.state.end('checking for updates...')
    });
  }

  ngOnDestroy(): void {
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.document.removeEventListener('dragover', this.onDragOver.bind(this));
    this.document.removeEventListener('drop', this.onDrop.bind(this));
    this.cancelSubscriptions$.next(true);
    this.cancelSubscriptions$.complete();
  }
}
