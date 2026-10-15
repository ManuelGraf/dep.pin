import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { packument } from '../../testing/test-data';
import { ChangelogInfoComponent, ChangelogInfoData } from './changelog-info.component';

describe('ChangelogInfoComponent', () => {
  it('shows the release notes between the current and the new version', async () => {
    const data: ChangelogInfoData = { packageName: 'foo', currentVersion: '^1.0.0', newVersion: '^1.2.0' };
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MAT_DIALOG_DATA, useValue: data }],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ChangelogInfoComponent);
    fixture.detectChanges();

    http
      .expectOne('https://registry.npmjs.org/foo')
      .flush({ ...packument('foo'), repository: { url: 'git+https://github.com/acme/foo.git' } });
    await vi.waitFor(() => http.expectOne('https://api.github.com/repos/acme/foo/releases'), { interval: 1 }).then(
      (request) =>
        request.flush([
          { name: 'v1.3.0', tag_name: 'v1.3.0', body: 'too new' },
          { name: 'v1.2.0', tag_name: 'v1.2.0', body: 'new feature' },
          { name: 'v1.1.0', tag_name: 'v1.1.0', body: 'bug fix' },
          { name: 'v1.0.0', tag_name: 'v1.0.0', body: 'already installed' },
        ]),
    );
    await vi.waitFor(() => expect((fixture.nativeElement as HTMLElement).textContent).toContain('new feature'));

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('bug fix');
    expect(text).not.toContain('too new');
    expect(text).not.toContain('already installed');
  });
});
