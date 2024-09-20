import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, of, take } from 'rxjs';
import * as semver from 'semver';


export interface Dependencies{
  [key: string]: string
}
export interface PackageVersionsResponse  {
  "_id":string,
  "_rev":string,
  name:string,
  description:string,
  versions?:{[key:string]:PackageJson},
  keywords?:string,
  author?:string
}

export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Dependencies;
  devDependencies?: Dependencies;
  peerDependencies?: Dependencies;
}
export interface VersionCache{[key:string]:PackageVersionsResponse}

@Injectable({
  providedIn: 'root'
})


export class DependencyService {
  package?: PackageJson;
  cache:VersionCache = {};

  constructor(private http: HttpClient) { }

  getPackageVersions(packageName: string): Observable<PackageVersionsResponse> {
    if(this.cache[packageName]) return of(this.cache[packageName]).pipe(take(1))
      return this.http.get<PackageVersionsResponse>(`https://registry.npmjs.org/${packageName}`).pipe(take(1),map(((versions:PackageVersionsResponse)=>{this.cache[packageName] = versions; return versions})));
  }
  getPackageVersion(name:string,versionrange:string){
    if(!this.cache[name]) return undefined;

    const versions = this.cache[name].versions;
    if(versions){

      const suitable = semver.maxSatisfying(Object.keys(versions),versionrange);
      return versions[suitable || '']
    }

    return undefined
  }
  // getPackageVersionInfo(dep:string,version:string):Promise<PackageJson|undefined>{
  //   return of(this.getFromCache(dep,version)).toPromise();
  // }
  // getFromCache(dep:string,version:string):PackageJson|undefined{
  //   const versions = this.cache[dep]?.versions;
  //   if(versions){
  //     console.log('from cache:',versions[version])
  //     return versions[version];
  //   }
  //   return undefined;
  // }
  // addToCache(name:string,versions:PackageVersionsResponse){
  //   this.cache[name] = versions;
  // }
  // cache(name:string,version:string,package:PackageJson){
  // }
  
  // getAllPeerDependencies(selectedDependencies:Dependencies): Observable<any> {
  //   if(this.cache[dep]?.versions[version]) return of(this.cache[dep].versions[version])
    
  //   const requests = Object.keys(selectedDependencies).map(dep => 
  //     this.http.get(`https://registry.npmjs.org/${dep}/${selectedDependencies[dep]}`)
  //   );
  //   return forkJoin(requests);
  // }

  parsePackageJson(fileContent: string): object {
    return JSON.parse(fileContent) as object;
  }
}
