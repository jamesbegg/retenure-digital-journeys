import { KeyValuePipe } from '@angular/common';
import { Component } from '@angular/core';
import { ClientHeaderProgress } from '../../interfaces/client-header';
import { Variants } from '../../interfaces/story';
import { ClientHeader } from './client-header';

@Component({
  selector: 'ret-client-header-story',
  imports: [ClientHeader, KeyValuePipe],
  templateUrl: './client-header.story.html',
})
export class ClientHeaderStory {
  protected readonly variants: Variants<ClientHeader> = {
    layout: {
      mobile: 'Mobile: progress sits beside Back',
      desktop: 'Desktop: progress centred, Back on the left',
    },
  };

  protected readonly progress: ClientHeaderProgress = {
    label: 'Your details',
    step: 2,
    total: 6,
    meta: 'About 8 minutes left',
  };
}
