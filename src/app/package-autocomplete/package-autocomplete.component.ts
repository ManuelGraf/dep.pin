import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';

interface RegistrySearchResponse {
  objects: { package: { name: string } }[];
}

@Component({
  selector: 'app-package-autocomplete',
  imports: [MatAutocompleteModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './package-autocomplete.component.html',
  styleUrl: './package-autocomplete.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackageAutocompleteComponent {
  private readonly http = inject(HttpClient);

  readonly added = output<string>();

  protected readonly query = signal('');
  /** set once a package was picked from the suggestions */
  protected readonly selected = signal<string | null>(null);

  protected readonly packages = toSignal(
    toObservable(this.query).pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((text) =>
        text
          ? this.http
              .get<RegistrySearchResponse>('https://registry.npmjs.org/-/v1/search', { params: { text, size: 10 } })
              .pipe(
                map((response) => response.objects.map((o) => o.package.name)),
                catchError(() => of([])),
              )
          : of([]),
      ),
    ),
    { initialValue: [] },
  );

  protected onInput(value: string): void {
    this.query.set(value);
    this.selected.set(null);
  }

  protected add(): void {
    const name = this.selected();
    if (name) {
      this.added.emit(name);
    }
  }
}
