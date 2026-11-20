import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { stories } from '@retenure/ui/stories';

@Component({
  selector: 'ret-gallery-index',
  imports: [RouterLink],
  templateUrl: './gallery-index.html',
  styleUrl: './gallery.scss',
})
export class GalleryIndex {
  protected readonly names = Object.keys(stories);
}
