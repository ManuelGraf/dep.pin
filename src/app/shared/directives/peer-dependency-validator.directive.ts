import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import * as semver from 'semver';

export function peerDependencyValidator(): ValidatorFn {
  return (formArray: AbstractControl): ValidationErrors | null => {
    const errors: string[] = [];
    const selectedDependencies: { [packageName: string]: string } = {};
    console.log('check peer depndencies')
    // Collect all selected dependencies and their versions
    formArray.value.forEach((dependency: any) => {
      selectedDependencies[dependency.name] = dependency.version;
    });
    console.log('selected',selectedDependencies)
    console.log('selected',formArray)
    
    // Iterate over each selected dependency to validate peer dependencies
    formArray.value.forEach((dependency: any) => {
      const peerDependencies = dependency.peerDependencies || {};
      
      Object.keys(peerDependencies).forEach(peerDep => {
        const peerVersion = peerDependencies[peerDep];
        const selectedVersion = selectedDependencies[peerDep];
        console.log('check peerDep ',dependency.name,selectedVersion,peerVersion)
        
        if (selectedVersion && !semver.satisfies(selectedVersion, peerVersion)) {
          errors.push(
            `Peer dependency conflict: ${dependency.name} requires ${peerDep} ${peerVersion} but selected version is ${selectedVersion}`
          );
        }
      });
    });

    return errors.length > 0 ? { peerDependencyConflict: errors } : null;
  };
}