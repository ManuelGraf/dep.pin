import { Injectable } from '@angular/core';
import * as childProcess from 'child_process';
import { ipcRenderer, webFrame } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { AuditReport } from '../../../audit-report/audit-report.component';
import { StateService } from '../../../state.service';
import { PackageJson } from '../dependency.service';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  ipcRenderer!: typeof ipcRenderer;
  webFrame!: typeof webFrame;
  childProcess!: typeof childProcess;
  fs!: typeof fs;
  path!: typeof path;

  constructor(private state:StateService) {
    if (this.isElectron) {
      this.ipcRenderer = (window as any).require('electron').ipcRenderer;
      this.webFrame = (window as any).require('electron').webFrame;
      this.fs = (window as any).require('fs');
      this.path = (window as any).require('path');
      this.childProcess = (window as any).require('child_process');

      this.logNodeAndNpmVersions();
    }
  }

  get isElectron(): boolean {
    return !!(window && window.process && window.process.type);
  }

  private logNodeAndNpmVersions(): void {
    this.childProcess.exec('node -v', (error, stdout) => {
      if (error) {
        console.error('Node version check failed:', error.message);
      } else {
        console.log('Node version:', stdout.trim());
      }
    });

    this.childProcess.exec('npm -v', (error, stdout) => {
      if (error) {
        console.error('NPM version check failed:', error.message);
      } else {
        console.log('NPM version:', stdout.trim());
      }
    });
  }

  ensureTempDirectoryExists(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.ipcRenderer.invoke('get-user-data-path')
        .then((userDataPath: string) => {
          const tempFolderPath = this.path.join(userDataPath, 'temp');
          if (!this.fs.existsSync(tempFolderPath)) {
            this.fs.mkdirSync(tempFolderPath, { recursive: true });
            console.log('Temp directory created:', tempFolderPath);
          }
          resolve(tempFolderPath);
        })
        .catch((error) => {
          console.error('Failed to get userData path:', error);
          reject(error);
        });
    });
  }

  private cleanupTempFiles(files: string[]): void {
    files.forEach((filePath) => {
      this.fs.unlink(filePath, (error) => {
        if (error) {
          console.error(`Failed to delete ${filePath}:`, error);
        } else {
          console.log(`Deleted temporary file: ${filePath}`);
        }
      });
    });
  }
  /** filters a package json for file urls and deletes the dependency */
  removeFileDependencies(pkg: PackageJson) {
    const ret = pkg;
    const regexp = /file:/gi;
    if (ret.dependencies) {
      for (const [key, value] of Object.entries(ret.dependencies)) {
        if (regexp.test(value)) {
          console.log('Removed file dependency ' + value);
          delete ret.dependencies[key];
        }
      }
    }
    if (ret.devDependencies) {
      for (const [key, value] of Object.entries(ret.devDependencies)) {
        if (regexp.test(value)) delete ret.devDependencies[key];
      }
    }
    if (ret.peerDependencies) {
      for (const [key, value] of Object.entries(ret.peerDependencies)) {
        if (regexp.test(value)) delete ret.peerDependencies[key];
      }
    }
    return ret;
  }

  runNpmAuditWithJson(jsonData: any): Promise<AuditReport> {
    return new Promise((resolve, reject) => {
      this.ensureTempDirectoryExists()
        .then((tempDirectory) => {
          const tempPackageJsonPath = this.path.join(tempDirectory, 'package.json');
          const tempPackageLockPath = this.path.join(tempDirectory, 'package-lock.json');
          const cleanPackage = { ...jsonData };
          delete cleanPackage.scripts;
          this.removeFileDependencies(cleanPackage as PackageJson);

          console.log('Writing temporary package.json...', cleanPackage);
          this.state.start('writing package...')
          this.fs.writeFile(tempPackageJsonPath, JSON.stringify(cleanPackage, null, 2), (writeError) => {
            this.state.end('writing package...')
            if (writeError) {
              console.error('Failed to write package.json:', writeError);
              reject(writeError);
              return;
            }

            console.log('Running npm install...');
            this.state.start('run npm install...')
            this.childProcess.exec('npm install --package-lock-only', { cwd: tempDirectory }, (installError, installStdout) => {
              this.state.end('run npm install...')
              if (installError) {
                console.error('npm install failed:', installError.message);
                this.cleanupTempFiles([tempPackageJsonPath, tempPackageLockPath]);
                reject(installError.message);
                return;
              }
              console.log('npm install output:', installStdout);

              console.log('Running npm audit...');
              this.state.start('run npm audit')
              this.childProcess.exec('npm audit --json', { cwd: tempDirectory }, (auditError, auditStdout, auditStderr) => {
                this.state.end('run npm audit')
                this.cleanupTempFiles([tempPackageJsonPath, tempPackageLockPath]);

                if (auditStdout) {
                  try {
                    const auditResult = JSON.parse(auditStdout) as AuditReport;
                    resolve(auditResult);
                  } catch (parseError) {
                    console.error('Failed to parse npm audit output:', parseError);
                    reject(parseError);
                  }
                } else if (auditError) {
                  console.warn('npm audit reported vulnerabilities:', auditError.message);
                  try {
                    const auditResult = JSON.parse(auditError.message) as AuditReport;
                    resolve(auditResult);
                  } catch (parseError) {
                    console.error('Failed to parse npm audit error message:', parseError);
                    reject(auditError.message);
                  }
                } else {
                  console.error('npm audit returned no output.');
                  reject(new Error('No output from npm audit.'));
                }
              });
            });
          });
        })
        .catch((error) => {
          console.error('Failed to ensure temp directory:', error);
          reject(error);
        });
    });
  }

  runNpmUpdate(packageName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ensureTempDirectoryExists()
        .then((tempDirectory) => {
          console.log(`Running npm update for package: ${packageName}...`);
          this.childProcess.exec(`npm update ${packageName}`, { cwd: tempDirectory }, (error, stdout, stderr) => {
            if (error) {
              console.error(`Failed to update package ${packageName}:`, error.message);
              reject(error);
              return;
            }
            console.log(`npm update output for ${packageName}:`, stdout);
            resolve();
          });
        })
        .catch((error) => {
          console.error('Failed to ensure temp directory:', error);
          reject(error);
        });
    });
  }
  runNpmCheckUpdates(jsonData: any): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
      this.ensureTempDirectoryExists()
        .then((tempDirectory) => {
          const tempPackageJsonPath = this.path.join(tempDirectory, 'package.json');
          const cleanPackage = { ...jsonData };
          delete cleanPackage.scripts;
          this.removeFileDependencies(cleanPackage as PackageJson);
  
          console.log('Writing temporary package.json...', cleanPackage);
          this.fs.writeFile(tempPackageJsonPath, JSON.stringify(cleanPackage, null, 2), (writeError) => {
            if (writeError) {
              console.error('Failed to write package.json:', writeError);
              reject(writeError);
              return;
            }
  
            console.log('Running npm-check-updates (ncu)...');
            this.childProcess.exec('npx npm-check-updates --jsonUpgraded', { cwd: tempDirectory }, (ncuError, ncuStdout, ncuStderr) => {
              if (ncuError) {
                console.error('npm-check-updates failed:', ncuError.message);
                console.error('ncu stderr:', ncuStderr.trim());
                reject(new Error(`npm-check-updates error: ${ncuError.message}`));
                return;
              }
  
              try {
                const ncuResult = JSON.parse(ncuStdout);
                console.log('npm-check-updates result:', ncuResult);
                resolve(ncuResult);
              } catch (parseError) {
                console.error('Failed to parse npm-check-updates output:', parseError);
                console.error('Raw output:', ncuStdout.trim());
                reject(new Error('Invalid JSON output from npm-check-updates.'));
              }
            });
          });
        })
        .catch((error) => {
          console.error('Failed to ensure temp directory:', error);
          reject(error);
        });
    });
  }
  

}
