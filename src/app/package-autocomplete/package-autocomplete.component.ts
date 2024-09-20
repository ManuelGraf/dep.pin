import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { map, Observable, startWith } from 'rxjs';

@Component({
  selector: 'app-package-autocomplete',
  templateUrl: './package-autocomplete.component.html',
  styleUrls: ['./package-autocomplete.component.scss']
})
export class PackageAutocompleteComponent implements OnInit {
  packageControl = new FormControl();
  filteredPackages!: Observable<string[]>;
  packages: string[] = []; // This will hold the package names

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Fetch packages from npm registry
    // this.update();
  }

  update(){
    this.fetchPackages();

    // Set up filtering based on the input
    this.filteredPackages = this.packageControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || ''))
    );

  }

  private _filter(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.packages.filter(packageName => packageName.toLowerCase().includes(filterValue));
  }
  private add(event:any){
    console.log(event);
  }

  private fetchPackages() {
    console.log('fetch search');
    // Fetch the list of npm packages from the npm registry
    this.http.get<any>('https://www.npmjs.com/search?q='+this.packageControl.value)
      .subscribe(response => {
        this.packages = response.objects.map((pkg: any) => pkg.package.name);
      });
      
  }
}
