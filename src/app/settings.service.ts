import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly isVisibleDependencies = signal(true);
  readonly isVisibleDevDependencies = signal(false);
}
