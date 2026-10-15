import type { AuditReport, PackageJson, UpdateReport } from './models';

/**
 * API exposed by the Electron preload script on `window.depPin`.
 * Everything that needs Node.js (npm, file system, clipboard) runs in the main process.
 */
export interface DepPinApi {
  /** runs `npm install --package-lock-only` + `npm audit --json` for the given package.json */
  audit(pkg: PackageJson): Promise<AuditReport>;
  /** runs npm-check-updates for the given package.json */
  checkUpdates(pkg: PackageJson): Promise<UpdateReport>;
  copyToClipboard(text: string): Promise<void>;
}

/** IPC channel names, shared by preload and main */
export const IpcChannel = {
  audit: 'npm:audit',
  checkUpdates: 'npm:check-updates',
  copyToClipboard: 'clipboard:write',
} as const;

declare global {
  interface Window {
    /** only available when running inside Electron */
    depPin?: DepPinApi;
  }
}
