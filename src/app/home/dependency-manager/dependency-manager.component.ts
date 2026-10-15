import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { AuditReportComponent } from '../../audit-report/audit-report.component';
import { DependencyService } from '../../core/dependency.service';
import { DesktopService } from '../../core/desktop.service';
import { AuditReport, PackageJson, UpdateReport } from '../../core/models';
import { DependencyEntry, DependencyType, PackageStore } from '../../core/package-store';
import { LoadingSpinnerComponent } from '../../loading-spinner/loading-spinner.component';
import { PackageAutocompleteComponent } from '../../package-autocomplete/package-autocomplete.component';
import { PackageInfoComponent } from '../../package-info/package-info.component';
import { SettingsService } from '../../settings.service';
import { StateService } from '../../state.service';
import { UpdateReportComponent } from '../../update-report/update-report.component';

interface DependencyGroup {
  type: DependencyType;
  label: string;
  count: number;
  items: DependencyEntry[];
}

/** result of a long running npm task */
interface TaskState<T> {
  running: boolean;
  result?: T;
  error?: string;
}

const groupLabels: Record<DependencyType, string> = {
  dependency: 'Dependencies',
  devDependency: 'DevDependencies',
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

@Component({
  selector: 'app-dependency-manager',
  imports: [
    JsonPipe,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatToolbarModule,
    MatTooltipModule,
    AuditReportComponent,
    LoadingSpinnerComponent,
    PackageAutocompleteComponent,
    PackageInfoComponent,
    UpdateReportComponent,
  ],
  templateUrl: './dependency-manager.component.html',
  styleUrl: './dependency-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:dragover)': 'onDragOver($event)',
    '(document:drop)': 'onDrop($event)',
  },
})
export class DependencyManagerComponent {
  private readonly store = inject(PackageStore);
  private readonly dependencyService = inject(DependencyService);
  private readonly desktop = inject(DesktopService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly state = inject(StateService);
  protected readonly settings = inject(SettingsService);

  protected readonly package = this.store.package;
  protected readonly showPackage = signal(false);
  protected readonly isFileDraggedOver = signal(false);
  protected readonly isHeaderCondensed = signal(false);
  protected readonly filter = signal('');

  protected readonly audit = signal<TaskState<AuditReport>>({ running: false });
  /** package revision the current audit result belongs to */
  private readonly auditedRevision = signal(0);
  protected readonly isAuditOutdated = computed(
    () => !!this.audit().result && this.auditedRevision() !== this.store.revision(),
  );
  protected readonly updates = signal<TaskState<UpdateReport>>({ running: false });
  protected readonly isLoading = computed(() => this.audit().running || this.updates().running);

  protected readonly dependencyCount = computed(() => this.store.entries().length);

  protected readonly groups = computed<DependencyGroup[]>(() => {
    const entries = this.store.entries();
    const matches = this.createFilter(this.filter());
    return (['dependency', 'devDependency'] as const)
      .map((type) => {
        const ofType = entries.filter((entry) => entry.type === type);
        return {
          type,
          label: groupLabels[type],
          count: ofType.length,
          items: ofType.filter((entry) => matches(entry.name)),
        };
      })
      .filter((group) => group.items.length > 0);
  });

  protected isVisibleDependencyType(type: DependencyType): boolean {
    return type === 'dependency'
      ? this.settings.isVisibleDependencies()
      : this.settings.isVisibleDevDependencies();
  }

  protected onScroll(event: Event): void {
    this.isHeaderCondensed.set((event.target as HTMLElement).scrollTop > 0);
  }

  protected onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      void this.readPackageFile(file);
    }
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    const items = Array.from(event.dataTransfer?.items ?? []);
    const isJson = items.some((item) => item.kind === 'file' && item.type === 'application/json');
    this.isFileDraggedOver.set(isJson);
    if (isJson) {
      this.state.end('Invalid file type detected');
    } else {
      this.state.start('Invalid file type detected');
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    if (!this.isFileDraggedOver()) {
      return;
    }
    this.isFileDraggedOver.set(false);
    const file = event.dataTransfer?.files[0];
    if (file?.type === 'application/json') {
      void this.readPackageFile(file);
    } else {
      this.snackBar.open('Please drop a valid package.json file', 'Close', { duration: 3000 });
    }
  }

  private async readPackageFile(file: File): Promise<void> {
    let packageJson: unknown;
    try {
      packageJson = JSON.parse(await file.text());
    } catch {
      packageJson = null;
    }
    if (!packageJson || typeof packageJson !== 'object') {
      this.snackBar.open('Invalid package.json file', 'Close', { duration: 3000 });
      return;
    }
    this.store.load(packageJson as PackageJson);
    this.filter.set('');
    this.state.clear();
    this.state.info('package.json loaded.');
    this.snackBar.open('package loaded', 'Close', { duration: 5000 });
    void this.runAudit();
    void this.checkUpdates();
  }

  protected async runAudit(): Promise<void> {
    const pkg = this.store.package();
    if (!pkg) {
      return;
    }
    const message = 'npm audit is running...';
    this.state.start(message);
    this.audit.set({ running: true });
    const revision = this.store.revision();
    try {
      this.audit.set({ running: false, result: await this.desktop.audit(pkg) });
      this.auditedRevision.set(revision);
    } catch (e) {
      this.audit.set({ running: false, error: errorMessage(e) });
    } finally {
      this.state.end(message);
    }
  }

  protected async checkUpdates(): Promise<void> {
    const pkg = this.store.package();
    if (!pkg) {
      return;
    }
    const message = 'checking for updates...';
    this.state.start(message);
    this.updates.set({ running: true });
    try {
      this.updates.set({ running: false, result: await this.desktop.checkUpdates(pkg) });
    } catch (e) {
      this.updates.set({ running: false, error: errorMessage(e) });
    } finally {
      this.state.end(message);
    }
  }

  protected async copyJsonToClipboard(): Promise<void> {
    await this.desktop.copyToClipboard(JSON.stringify(this.store.package(), null, 2));
    this.snackBar.open('copied to clipboard', 'Close', { duration: 1000 });
  }

  protected async onPackageAdded(name: string): Promise<void> {
    try {
      await firstValueFrom(this.dependencyService.getPackageVersions(name));
    } catch {
      this.snackBar.open(`Could not load versions of ${name}`, 'Close', { duration: 3000 });
      return;
    }
    const latest = this.dependencyService.getLatestVersion(name);
    if (latest) {
      this.store.addDependency(name, latest);
    }
  }

  /** filter queries are regular expressions, falling back to plain text if invalid */
  private createFilter(query: string): (name: string) => boolean {
    if (!query) {
      return () => true;
    }
    try {
      const regexp = new RegExp(query, 'i');
      return (name) => regexp.test(name);
    } catch {
      const lower = query.toLowerCase();
      return (name) => name.toLowerCase().includes(lower);
    }
  }
}
