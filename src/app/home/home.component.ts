import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DependencyManagerComponent } from './dependency-manager/dependency-manager.component';

@Component({
  selector: 'app-home',
  imports: [DependencyManagerComponent],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {}
