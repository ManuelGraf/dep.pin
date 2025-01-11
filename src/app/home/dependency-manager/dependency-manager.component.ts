/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom, map } from 'rxjs';
import * as semver from 'semver';
import { ClipboardService } from '../../clipboard.service';
import { ElectronService } from '../../core/services';
import {
  Dependencies,
  DependencyService,
  PackageJson,
} from '../../core/services/dependency.service';

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
  package: PackageJson | null = null;
  showPackage: boolean = false;
  auditResults: string = "";
  state = new BehaviorSubject<string>('Idle');
  
  constructor(
    private fb: FormBuilder,
    public dependencyService: DependencyService,
    private electron:ElectronService,
    private snackBar: MatSnackBar,
    private router: Router,
    private clipboard: ClipboardService
  ) {
    (window as any).form = this.dependenciesForm;
  }
  
  ngOnInit(): void {
    this.dependenciesForm = this.fb.group({
      dependencies: this.fb.array([]),
      // devDependencies: this.fb.array([],peerDependencyValidator()),
    });
    (window as any).deps = this.dependenciesForm.get('dependencies');
  }
  setState(state:string){
    this.state.next(state);
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
          const packageJson: PackageJson = JSON.parse(e.target.result);
          this.package = packageJson;
          this.clearDependencies();
          this.addDependencies(packageJson.dependencies || {}, 'dependency');
          this.addDependencies(
            packageJson.devDependencies || {},
            'devDependency'
          );
        } catch (error) {
          this.snackBar.open('Invalid package.json file', 'Close', {
            duration: 3000,
          });
        }
      };
      reader.readAsText(file);
      this.snackBar.open('package loaded', 'Close', {
        duration: 5000,
        panelClass: ['snackbar'],
      });
      this.isLoading = false;
    }
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
    if(version.includes('file:')) return;
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
      this.auditResults = "";
    });
  }
  validatePeerDeps(peerDeps: any) {
    if (!Object.keys(peerDeps).length) return [];
    const issues: string[] = [];
    Object.entries(peerDeps).forEach(([peerName, peerVersion]) => {
      let hasPeerDep = false;
      const all = this.dependenciesForm.get('dependencies') as FormArray;
      all.controls.forEach((ctrl:AbstractControl) => {
        if (peerName === ctrl.get('name')?.value) {
          hasPeerDep = true;
          if (
            !semver.satisfies(ctrl.get('version')?.value,peerVersion as string )
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
          return Object.keys(versions.versions).sort((a, b) => semver.rcompare(a, b));
      })
    );
  }
  updatePackageJson() {
    this.setState('update Package Json')
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
    this.setState('updated Package Json')

    console.log('updated json', JSON.stringify(this.package));
  }
  getDepForm():FormArray{
    return this.dependenciesForm.get('dependencies') as FormArray
  }
  copyJsonToClipboard() {
    this.clipboard.copyToClipboard(this.package);
    this.snackBar.open('coped to Clipboard','close',{
      duration: 1000,
    });
  }
  async onPackageAdded(name:any){
    const available = await firstValueFrom(this.getAvailableVersionsList(name))
    if(available){
      const latest = available[0];
      this.addDependency(name.name,latest,this.dependenciesForm.get('dependencies') as FormArray,'dependencies');
      console.log('package added', name,latest)
    }
  }
  async audit(){
    console.log('audit start');
    this.setState('run audit');
    
    this.isLoading = true;
    try{
      this.auditResults = await this.electron.runNpmAuditWithJson(this.package);
    }catch(e){
      console.warn(e);
    }
    this.isLoading = false;
    console.log('audit end',this.auditResults)
    this.setState('audit finished')
  }
}
