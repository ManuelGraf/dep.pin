import { Injectable } from '@angular/core';
import type { DepPinApi } from './dep-pin-api';
import { AuditReport, PackageJson, UpdateReport } from './models';

/** Bridge to the Electron main process (see electron/preload.ts) */
@Injectable({ providedIn: 'root' })
export class DesktopService {
  private readonly api: DepPinApi | undefined = window.depPin;

  readonly isDesktop = !!this.api;

  audit(pkg: PackageJson): Promise<AuditReport> {
    return this.requireApi().audit(pkg);
  }

  checkUpdates(pkg: PackageJson): Promise<UpdateReport> {
    return this.requireApi().checkUpdates(pkg);
  }

  copyToClipboard(text: string): Promise<void> {
    return this.api ? this.api.copyToClipboard(text) : navigator.clipboard.writeText(text);
  }

  private requireApi(): DepPinApi {
    if (!this.api) {
      throw new Error('This feature is only available in the desktop app.');
    }
    return this.api;
  }
}
