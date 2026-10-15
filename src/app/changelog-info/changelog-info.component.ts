import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { marked } from 'marked';
import { firstValueFrom } from 'rxjs';
import * as semver from 'semver';
import { DependencyService } from '../core/dependency.service';
import { PackageStore } from '../core/package-store';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

export interface ChangelogInfoData {
  packageName: string;
  currentVersion: string | null;
  newVersion: string;
}

interface GithubRelease {
  name: string | null;
  tag_name: string;
  body: string | null;
}

@Component({
  selector: 'app-changelog-info',
  imports: [MatButtonModule, MatDialogModule, LoadingSpinnerComponent],
  templateUrl: './changelog-info.component.html',
  styleUrl: './changelog-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogInfoComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly dependencyService = inject(DependencyService);
  private readonly store = inject(PackageStore);
  protected readonly data = inject<ChangelogInfoData>(MAT_DIALOG_DATA);

  protected readonly changelog = signal<string | null>(null);
  protected readonly isLoading = signal(true);
  /** rendered markdown; bound via [innerHTML], which Angular sanitizes */
  protected readonly changelogHtml = computed(() => {
    const changelog = this.changelog();
    return changelog ? marked.parse(changelog, { async: false }) : null;
  });

  ngOnInit(): void {
    void this.loadChangelog().finally(() => this.isLoading.set(false));
  }

  protected install(): void {
    this.store.setVersion(this.data.packageName, this.data.newVersion);
  }

  private async loadChangelog(): Promise<void> {
    let repositoryUrl: string | undefined;
    try {
      const info = await firstValueFrom(this.dependencyService.getPackageVersions(this.data.packageName));
      repositoryUrl = info.repository?.url;
    } catch {
      this.changelog.set('Failed to fetch package details.');
      return;
    }
    if (!repositoryUrl?.includes('github.com')) {
      this.changelog.set('Repository URL not available or not hosted on GitHub.');
      return;
    }
    const apiUrl = this.toGithubApiUrl(repositoryUrl);
    this.changelog.set((await this.fetchReleaseNotes(apiUrl)) ?? (await this.fetchChangelogFile(apiUrl)));
  }

  /** release notes of all GitHub releases between the current and the new version */
  private async fetchReleaseNotes(apiUrl: string): Promise<string | null> {
    try {
      const releases = await firstValueFrom(this.http.get<GithubRelease[]>(`${apiUrl}/releases`));
      if (!releases.length) {
        return null;
      }
      const from = semver.minVersion(this.data.currentVersion ?? '0.0.0')?.version ?? '0.0.0';
      const to = semver.minVersion(this.data.newVersion)?.version ?? this.data.newVersion;
      const range = `>${from} <=${to}`;
      return releases
        .filter((release) => {
          const version = semver.coerce(release.tag_name) ?? semver.coerce(release.name);
          return version && semver.satisfies(version, range);
        })
        .map((release) => `## ${release.name || release.tag_name}\n\n${release.body ?? ''}`)
        .join('\n\n');
    } catch {
      return null;
    }
  }

  private async fetchChangelogFile(apiUrl: string): Promise<string> {
    try {
      return await firstValueFrom(
        this.http.get(`${apiUrl}/contents/CHANGELOG.md`, {
          headers: { Accept: 'application/vnd.github.v3.raw' },
          responseType: 'text',
        }),
      );
    } catch {
      return 'No changelog found.';
    }
  }

  private toGithubApiUrl(repoUrl: string): string {
    const path = repoUrl.replace(/^.*github\.com[/:]/, '').replace(/\.git$/, '');
    return `https://api.github.com/repos/${path}`;
  }
}
