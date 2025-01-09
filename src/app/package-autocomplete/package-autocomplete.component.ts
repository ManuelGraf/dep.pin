import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-package-autocomplete',
  templateUrl: './package-autocomplete.component.html',
  styleUrls: ['./package-autocomplete.component.scss']
})
export class PackageAutocompleteComponent implements OnInit {
  packageControl = new FormControl();
  filteredPackages!: Observable<string[]>;
  packages: string[] = []; // This will hold the package names
  valid = false;
  @Output() added = new EventEmitter<string>();
  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Fetch packages from npm registry
    // this.update();
  }

  update(){
    this.valid = false;
    this.fetchPackages();
  }

  add(event:any){
    console.log(event);
    if(this.valid){
      this.added.emit(this.packageControl.value)
    }
  }

  private fetchPackages() {
    console.log('fetch search');
    // Fetch the list of npm packages from the npm registry
    if(this.packageControl.value){
      this.http.get<any>(`https://registry.npmjs.org/-/v1/search?text=${this.packageControl.value}&size=10`)
        .subscribe(response => {
          this.packages = response.objects.map((pkg: any) => pkg.package.name);
          console.log('search result',this.packages, response);
        });
    }
      
  }
}
