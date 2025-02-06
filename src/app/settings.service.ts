import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  isVisibleDependencies= true;
  isVisibleDevDependencies= false;

  constructor() { }
}
