import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnInit, SimpleChanges } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import * as semver from 'semver';
import { DependencyService } from '../core/services/dependency.service';
import { GithubRelease } from '../github.service';

@Component({
  selector: 'app-changelog-info',
  templateUrl: `changelog-info.component.html`,
  styleUrls: ['./changelog-info.component.scss'],
})
export class ChangelogInfoComponent implements OnInit {
  
  changelog: string | null = null;
  isLoading = true;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { packageName: string; currentVersion: string | null; newVersion: string },
    private http: HttpClient, 
    private dependencyService:DependencyService,
  ) {
    console.log('Dialog received data:', this.data);

  if (!this.data.packageName) {
    console.error('Error: packageName is null or undefined.');
    return;
  }
  this.fetchChangelog();
}

  ngOnInit(): void {
    console.log('changelog init',this.data.packageName,this.data.currentVersion,this.data.newVersion)
  }
  ngOnChanges(changes: SimpleChanges): void {
    //Called before any other lifecycle hook. Use it to inject dependencies, but avoid any serious work here.
    //Add '${implements OnChanges}' to the class.
    console.log(changes);
  }

  private fetchChangelog(): void {
    // Query the NPM registry for package details
    
    this.dependencyService.getPackageVersions(this.data.packageName).subscribe(
      (data) => {
        const repositoryUrl = data?.repository?.url;
        console.log('changelog repository url',repositoryUrl)
        if (repositoryUrl && repositoryUrl.includes('github.com')) {
          const apiUrl = this.convertRepoToApi(repositoryUrl);
          console.log('fetch changelog for',apiUrl)
          this.getChangelogFromGithub(apiUrl);
        } else {
          this.changelog = 'Repository URL not available or not hosted on GitHub.';
        }
      },
      (error) => {
        console.error('Error fetching package details:', error);
        this.changelog = 'Failed to fetch package details.';
      }
    );
  }

  private convertRepoToApi(repoUrl: string): string {
    return repoUrl
      .replace('git+', '')
      .replace('.git', '')
      .replace('github.com', 'api.github.com/repos');
  }

  private getChangelogFromGithub(apiUrl: string): void {
    // Try fetching releases first
    this.http.get<GithubRelease[]>(`${apiUrl}/releases`).subscribe(
      
      (releases) => {
        console.log('github releases',releases)
        if (releases && releases.length > 0) {
          for (const release  of releases) {
            const clean = semver.coerce(release.name) || release.name;
            const before = this.extractVersionFromRange(this.data.currentVersion || '');
            const after = this.extractVersionFromRange(this.data.newVersion);
            if(semver.satisfies(clean ,`${before} - ${after}`))
              {
                console.log('release %s satisfies range %s ',release.tag_name, `${before} - ${after}`)
                console.log(release.body)
                this.changelog += release.body || '';
              }else{
              console.log('release %s DOESNT satisfy range %s ',clean, `${before} - ${after}`)
            }
            
          }
        } else {
          this.fetchRawChangelog(apiUrl);
        }
        this.isLoading = false;
      },
      (error) => {
        console.warn('Releases not found, attempting to fetch raw changelog:', error);
        this.fetchRawChangelog(apiUrl);
        this.isLoading = false;
      }
    );
  }
  
  private fetchRawChangelog(apiUrl: string): void {
    this.http
    .get(`${apiUrl}/contents/CHANGELOG.md`, {
        headers: { Accept: 'application/vnd.github.v3.raw' },
        responseType: 'text',
      })
      .subscribe(
        (changelog) => {
          this.changelog = changelog;
        },
        (error) => {
          console.error('Error fetching raw changelog:', error);
          this.changelog = 'No changelog found.';
          this.isLoading = false;
        }
      );
  }

  extractVersionFromRange(range: string): string {
    const match = range.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : range;
  }
  install(){
    this.dependencyService.setPackageVersion(this.data.packageName,this.data.newVersion)
  }
}
