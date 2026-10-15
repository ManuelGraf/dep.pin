import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as semver from 'semver';
import type { ChangelogInfoData } from '../changelog-info/changelog-info.component';
import { PackageJson, UpdateReport } from '../core/models';
import { PackageStore } from '../core/package-store';

export interface UpdateRow {
  package: string;
  before: string | null;
  after: string;
  isMajorUpdate: boolean;
}

@Component({
  selector: 'app-update-report',
  imports: [
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginator,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './update-report.component.html',
  styleUrl: './update-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateReportComponent {
  private readonly store = inject(PackageStore);
  private readonly dialog = inject(MatDialog);

  readonly package = input.required<PackageJson>();
  readonly report = input.required<UpdateReport>();

  protected readonly displayedColumns = ['package', 'before', 'after', 'update'];
  protected readonly dataSource = new MatTableDataSource<UpdateRow>();
  protected readonly filter = signal('');
  private readonly paginator = viewChild(MatPaginator);

  /** available updates that have not been applied yet */
  protected readonly rows = computed<UpdateRow[]>(() => {
    const pkg = this.package();
    const current = { ...pkg.peerDependencies, ...pkg.devDependencies, ...pkg.dependencies };
    return Object.entries(this.report())
      .map(([name, after]) => {
        const before = current[name] ?? null;
        const from = before ? semver.minVersion(before) : null;
        const to = semver.minVersion(after);
        return {
          package: name,
          before,
          after,
          isMajorUpdate: !!from && !!to && semver.major(to) > semver.major(from),
        };
      })
      .filter((row) => row.before !== row.after);
  });

  constructor() {
    effect(() => {
      this.dataSource.data = this.rows();
      this.dataSource.filter = this.filter().trim().toLowerCase();
      this.dataSource.paginator = this.paginator() ?? null;
    });
  }

  protected update(name: string, version: string): void {
    this.store.setVersion(name, version);
  }

  protected updateAll(): void {
    if (confirm('Are you sure you want to update all visible packages?')) {
      for (const row of this.dataSource.filteredData) {
        this.update(row.package, row.after);
      }
    }
  }

  protected async openChangelog(row: UpdateRow): Promise<void> {
    // lazy loaded, keeps the markdown parser out of the initial bundle
    const { ChangelogInfoComponent } = await import('../changelog-info/changelog-info.component');
    this.dialog.open<unknown, ChangelogInfoData>(ChangelogInfoComponent, {
      width: '800px',
      data: { packageName: row.package, currentVersion: row.before, newVersion: row.after },
    });
  }
}
