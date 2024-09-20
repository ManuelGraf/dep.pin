import { Injectable } from '@angular/core';
import { ElectronService } from './core/services';

@Injectable({
  providedIn: 'root'
})
export class ClipboardService {

  constructor(private electron:ElectronService) { }
  copyToClipboard(obj: any): void {
    const jsonString = JSON.stringify(obj, null, 2);  // Pretty-print JSON with indentation

    // Check if we are in Electron environment
    if (this.electron.isElectron) {
      const { clipboard } = window.require('electron');
      clipboard.writeText(jsonString);
      console.log('Copied to clipboard using Electron clipboard API');
    } else if (navigator && navigator.clipboard) {
      // Browser environment
      navigator.clipboard.writeText(jsonString)
        .then(() => {
          console.log('Copied to clipboard using Browser clipboard API');
        })
        .catch(err => {
          console.error('Failed to copy to clipboard:', err);
        });
    } else {
      console.error('Clipboard API not supported in this environment');
    }
  }

}
