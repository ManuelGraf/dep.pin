import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class GithubService {
  
  
  constructor() { }
}

export interface GithubRelease{
    "url": string,
    "assets_url": string,
    "upload_url": string,
    "html_url": string,
    "id": number,
    author: any,
    "node_id": string,
    "tag_name": string,
    "target_commitish": string,
    "name": string,
    "draft": false,
    "prerelease": true,
    "created_at": string,
    "published_at": string,
    "assets": [],
    "tarball_url": string,
    "zipball_url": string,
    "body": string
}