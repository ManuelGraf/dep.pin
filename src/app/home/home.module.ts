import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { HomeRoutingModule } from './home-routing.module';

import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AuditReportComponent } from '../audit-report/audit-report.component';
import { PackageAutocompleteComponent } from '../package-autocomplete/package-autocomplete.component';
import { SharedModule } from '../shared/shared.module';
import { DependencyManagerComponent } from './dependency-manager/dependency-manager.component';
import { HomeComponent } from './home.component';

@NgModule({
  declarations: [
    HomeComponent,
    DependencyManagerComponent,
    PackageAutocompleteComponent,
    AuditReportComponent
  ],
  imports: [CommonModule, SharedModule,HomeRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatExpansionModule,
    MatIconModule,
    MatAutocompleteModule
    
  ]
})
export class HomeModule {}
