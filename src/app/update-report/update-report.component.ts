import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import * as semver from 'semver'; // Import semver
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
  get count(){
    return this.dataSource.data.length;
  }
  displayedColumns: string[] = ['package', 'before', 'after', 'update'];
  dataSource = new MatTableDataSource<UpdateRow>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private dependencyService: DependencyService) {}

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
    const updatedData = this.dataSource.data.filter(row => row.package !== name);
    this.dataSource.data = updatedData;
  }

  updateAll(): void {
    if (confirm('Are you sure you want to update all packages?')) {
      const dataSourceData = this.dataSource?.data; // Access the underlying data array
      if (dataSourceData?.length) {
        dataSourceData.forEach((element) => {
          if (element.package && element.after) {
            this.update(element.package, element.after);
          }
        });
      }
    }
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
}
