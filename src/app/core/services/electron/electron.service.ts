import { Injectable } from '@angular/core';
import * as childProcess from 'child_process';
import { ipcRenderer, webFrame } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  ipcRenderer!: typeof ipcRenderer;
  webFrame!: typeof webFrame;
  childProcess!: typeof childProcess;
  fs!: typeof fs;
  path!: typeof path;

  constructor() {
    // Conditional imports
    if (this.isElectron) {
      this.ipcRenderer = (window as any).require('electron').ipcRenderer;
      this.webFrame = (window as any).require('electron').webFrame;
      this.fs = (window as any).require('fs');
      this.path = (window as any).require('path'); 
      this.childProcess = (window as any).require('child_process');

      this.childProcess.exec('node -v', (error, stdout, stderr) => {
        if (error) {
          console.error(`error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return;
        }
        console.log(`stdout:\n${stdout}`);
      });
    }
  }

  get isElectron(): boolean {
    return !!(window && window.process && window.process.type);
  }

  ensureTempDirectoryExists(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Use Electron's userData path to store temp files
      this.ipcRenderer.invoke('get-user-data-path').then((userDataPath: string) => {
        const tempFolderPath = this.path.join(userDataPath, 'temp');

        if (!this.fs.existsSync(tempFolderPath)) {
          this.fs.mkdirSync(tempFolderPath, { recursive: true });
          console.log('Temp directory created:', tempFolderPath);
        }

        resolve(tempFolderPath);
      }).catch((error) => {
        console.error('Failed to get userData path:', error);
        reject(error);
      });
    });
  }

  /**
   * 
   * @param jsonData saves a temporary package json and runs npm audit
   * @returns 
   */
  runNpmAuditWithJson(jsonData: any): Promise<string> {
    return new Promise((resolve, reject) => {
      this.ensureTempDirectoryExists().then((tempDirectory) => {
        const tempPackageJsonPath = this.path.join(tempDirectory, 'package.json');
        const tempPackageLockPath = this.path.join(tempDirectory, 'package-lock.json');
        // remove scripts
        const cleanPackage = JSON.parse(JSON.stringify(jsonData));
        delete cleanPackage.scripts;
        console.log('run audit for',cleanPackage);
        // Write the provided JSON data to the temporary package.json
        this.fs.writeFile(tempPackageJsonPath, JSON.stringify(cleanPackage, null, 2), (writeError) => {
          if (writeError) {
            console.error('Failed to write temporary package.json:', writeError);
            reject(writeError);
            return;
          }

          // Run npm install to generate the package-lock.json file
          this.childProcess.exec(`npm install --package-lock-only`, { cwd: tempDirectory }, (installError, installStdout, installStderr) => {
            if (installError) {
              console.error(`Failed to generate package-lock.json: ${installError.message}`);
              reject(installError.message);
              return;
            }

            // After generating package-lock.json, run npm audit
            this.childProcess.exec(`npm audit --json`, { cwd: tempDirectory }, (auditError, auditStdout, auditStderr) => {
              if (auditError) {
                console.error(`Audit error: ${auditError.message}`);
                reject(auditError.message);
              } else if (auditStderr) {
                console.error(`Audit stderr: ${auditStderr}`);
                reject(auditStderr);
              } else {
                resolve(JSON.parse(auditStdout));
              }

              // Clean up the temporary files
              this.fs.unlink(tempPackageJsonPath, (unlinkJsonError) => {
                if (unlinkJsonError) {
                  console.error('Failed to delete temporary package.json:', unlinkJsonError);
                }
              });
              this.fs.unlink(tempPackageLockPath, (unlinkLockError) => {
                if (unlinkLockError) {
                  console.error('Failed to delete temporary package-lock.json:', unlinkLockError);
                }
              });
            });
          });
        });
      }).catch((error) => {
        reject(error);
      });
    });
  }
}
