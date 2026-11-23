import { Component } from '@angular/core';
import { ClientHeaderProgress } from '../../interfaces/client-header';
import { Variants } from '../../interfaces/story';
import { ClientHeader } from './client-header';

@Component({
  selector: 'ret-client-header-story',
  imports: [ClientHeader],
  templateUrl: './client-header.story.html',
})
export class ClientHeaderStory {
  protected readonly variants: Variants<ClientHeader> = {};

  protected readonly progress: ClientHeaderProgress = {
    label: 'Your details',
    step: 2,
    total: 6,
    meta: 'About 8 minutes left',
    valueText: 'Step 2 of 6',
  };
}
