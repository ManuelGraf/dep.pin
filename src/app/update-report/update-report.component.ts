import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import * as semver from 'semver'; // Import semver
import { ChangelogInfoComponent } from '../changelog-info/changelog-info.component';
import { DependencyService, PackageJson } from '../core/services/dependency.service';

export interface UpdateReport {
  [key: string]: string;
}

export interface UpdateRow {
  package: string;
  before: string | null;
  after: string;
  isMajorUpdate: boolean;
}

@Component({
  selector: 'app-update-report',
  templateUrl: './update-report.component.html',
  styleUrls: ['./update-report.component.scss'],
})
export class UpdateReportComponent implements OnInit {
  @Input() package?: PackageJson;
  @Input() report?: UpdateReport;

  get count() {
    return this.dataSource.data.length;
  }

  displayedColumns: string[] = ['package', 'before', 'after', 'update'];
  dataSource = new MatTableDataSource<UpdateRow>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private dependencyService: DependencyService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.updateTableData();
  }

  ngOnChanges(): void {
    this.updateTableData();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator; // Attach paginator after view initialization
  }

  getCurrentVersion(name: string): string | null {
    const all = {
      ...this.package?.dependencies,
      ...this.package?.devDependencies,
      ...this.package?.peerDependencies,
    };
    return all[name] || null;
  }

  update(name: string, version: string): void {
    this.dependencyService.setPackageVersionSelection$.next({ name, version });
    this.removeRow(name);
  }

  removeRow(name: string): void {
    const updatedData = this.dataSource.data.filter((row) => row.package !== name);
    this.dataSource.data = updatedData;
  }

  updateAll(): void {
    if (confirm('Are you sure you want to update all visible packages?')) {
      const visibleData = this.dataSource.filteredData; // Get currently visible rows
      if (visibleData?.length) {
        visibleData.forEach((element) => {
          if (element.package && element.after) {
            this.update(element.package, element.after);
          }
        });
      }
    }
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  private updateTableData(): void {
    if (!this.report || !this.package) {
      this.dataSource.data = [];
      return;
    }

    this.dataSource.data = Object.entries(this.report).map(([key, value]) => {
      const currentVersion = this.getCurrentVersion(key);
      const isMajorUpdate =
        currentVersion && semver.valid(currentVersion) && semver.valid(value)
          ? semver.diff(currentVersion, value) === 'major'
          : false;

      return {
        package: key,
        before: currentVersion,
        after: value,
        isMajorUpdate,
      };
    });
  }

  openChangelog(packageName: string, currentVersion: string | null, newVersion: string): void {
    console.log('open changelog for %o from %o to %o', packageName,currentVersion,newVersion)
    this.dialog.open(ChangelogInfoComponent, {
      width: '800px',
      data: { packageName, currentVersion, newVersion },
    });
  }
}
