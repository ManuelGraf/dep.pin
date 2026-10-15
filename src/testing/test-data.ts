import { PackageJson, PackageVersionsResponse } from '../app/core/models';

export const testPackage: PackageJson = {
  name: 'test-app',
  version: '1.0.0',
  scripts: { start: 'node index.js' },
  dependencies: { foo: '^1.0.0', local: 'file:../local' },
  devDependencies: { bar: '~2.1.0' },
};

export function packument(
  name: string,
  versions: Record<string, PackageJson> = {},
  latest?: string,
): PackageVersionsResponse {
  return {
    _id: name,
    _rev: '1',
    name,
    description: '',
    versions,
    'dist-tags': latest ? { latest } : undefined,
  };
}
