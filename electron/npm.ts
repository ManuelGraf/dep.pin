import { app } from 'electron';
import { exec } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AuditReport, Dependencies, PackageJson, UpdateReport } from '../src/app/core/models';

/** npm audit output can get large for big dependency trees */
const MAX_BUFFER = 64 * 1024 * 1024;

interface ExecResult {
  stdout: string;
  stderr: string;
  error: Error | null;
}

/** runs a fixed command in a shell (needed for npm.cmd on Windows), never rejects */
function run(command: string, cwd: string): Promise<ExecResult> {
  return new Promise((resolve) => {
    exec(command, { cwd, maxBuffer: MAX_BUFFER, windowsHide: true }, (error, stdout, stderr) =>
      resolve({ error, stdout, stderr }),
    );
  });
}

function withoutFileDependencies(deps: Dependencies | undefined): Dependencies | undefined {
  if (!deps) {
    return deps;
  }
  return Object.fromEntries(Object.entries(deps).filter(([, version]) => !version.startsWith('file:')));
}

/** strips scripts and local file dependencies, which can't be resolved outside the original project */
export function sanitizePackage(pkg: PackageJson): PackageJson {
  const { scripts: _scripts, ...rest } = pkg;
  return {
    ...rest,
    dependencies: withoutFileDependencies(pkg.dependencies),
    devDependencies: withoutFileDependencies(pkg.devDependencies),
    peerDependencies: withoutFileDependencies(pkg.peerDependencies),
  };
}

export async function runAudit(pkg: PackageJson): Promise<AuditReport> {
  // a fresh directory per run, so parallel audits can't interfere
  const dir = await mkdtemp(path.join(app.getPath('temp'), 'dep-pin-audit-'));
  try {
    await writeFile(path.join(dir, 'package.json'), JSON.stringify(sanitizePackage(pkg), null, 2));

    const install = await run('npm install --package-lock-only --force --ignore-scripts', dir);
    if (install.error) {
      throw new Error(`npm install failed: ${install.stderr.trim() || install.error.message}`);
    }

    // npm audit exits with a non-zero code when vulnerabilities are found, the report is still on stdout
    const audit = await run('npm audit --json', dir);
    if (!audit.stdout.trim()) {
      throw new Error(`npm audit returned no output: ${audit.stderr.trim() || audit.error?.message}`);
    }
    return JSON.parse(audit.stdout) as AuditReport;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function runCheckUpdates(pkg: PackageJson): Promise<UpdateReport> {
  const { run: ncu } = await import('npm-check-updates');
  const result = await ncu({
    packageData: JSON.stringify(sanitizePackage(pkg)),
    jsonUpgraded: true,
    silent: true,
  });
  return (result ?? {}) as UpdateReport;
}
