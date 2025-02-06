import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { HomeRoutingModule } from './home-routing.module';

import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MarkdownModule } from 'ngx-markdown';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { AuditReportComponent } from '../audit-report/audit-report.component';
import { ChangelogInfoComponent } from '../changelog-info/changelog-info.component';
import { GroupByPipe } from '../group-by.pipe';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { PackageAutocompleteComponent } from '../package-autocomplete/package-autocomplete.component';
import { PackageInfoComponent } from '../package-info/package-info.component';
import { SafeHtmlPipe } from '../safe-html.pipe';
import { SharedModule } from '../shared/shared.module';
import { UpdateReportComponent } from '../update-report/update-report.component';
import { DependencyManagerComponent } from './dependency-manager/dependency-manager.component';
import { HomeComponent } from './home.component';
@NgModule({
  declarations: [
    HomeComponent,
    DependencyManagerComponent,
    PackageAutocompleteComponent,
    AuditReportComponent,
    PackageInfoComponent,
    UpdateReportComponent,
    LoadingSpinnerComponent,
    ChangelogInfoComponent,
    SafeHtmlPipe,
    GroupByPipe
  ],
  imports: [
    CommonModule, 
    SharedModule,
    HomeRoutingModule,
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
    MatAutocompleteModule,
    MatTooltipModule,
    MatToolbarModule,
    MatGridListModule,
    MatPaginatorModule,
    MatTableModule,
    MatDialogModule,
    MarkdownModule.forRoot(),
    NgScrollbarModule
  ]
})
export class HomeModule {}
