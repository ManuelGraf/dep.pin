// Plain data types shared between the Angular renderer and the Electron main process.
// Must not import anything from Angular.

export type Dependencies = Record<string, string>;

export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Dependencies;
  devDependencies?: Dependencies;
  peerDependencies?: Dependencies;
  [key: string]: unknown;
}

export interface PackageVersionsResponse {
  _id: string;
  _rev: string;
  name: string;
  description: string;
  versions?: Record<string, PackageJson>;
  keywords?: string;
  repository?: { type?: string; url?: string };
  author?: string;
  'dist-tags'?: Record<string, string>;
}

export type Severity = 'critical' | 'high' | 'moderate' | 'low';

export interface Breach {
  cvss?: { score: number; vectorString: string };
  cwe?: string[];
  dependency: string;
  name: string;
  range?: string;
  severity?: Severity;
  source?: number;
  title?: string;
  url?: string;
}

export interface Vulnerability {
  effects?: string[];
  fixAvailable?: boolean | { isSemVerMajor: boolean; name: string; version: string };
  isDirect?: boolean;
  name: string;
  nodes: string[];
  range: string;
  severity: Severity;
  /** either a breach or the name of a transitive package causing it */
  via: (Breach | string)[];
}

export interface AuditReport {
  auditReportVersion?: number;
  vulnerabilities?: Record<string, Vulnerability>;
  metadata?: {
    vulnerabilities: Record<Severity | 'info' | 'total', number>;
    dependencies?: Record<'prod' | 'dev' | 'optional' | 'peer' | 'peerOptional' | 'total', number>;
  };
}

/** package name -> upgraded version range, as returned by `ncu --jsonUpgraded` */
export type UpdateReport = Record<string, string>;
