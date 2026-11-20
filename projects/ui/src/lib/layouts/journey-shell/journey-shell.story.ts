import { KeyValuePipe } from '@angular/common';
import { Component } from '@angular/core';
import { Variants } from '../../interfaces/story';
import { JourneyShell } from './journey-shell';

@Component({
  selector: 'ret-journey-shell-story',
  imports: [JourneyShell, KeyValuePipe],
  templateUrl: './journey-shell.story.html',
})
export class JourneyShellStory {
  protected readonly variants: Variants<JourneyShell> = {
    layout: {
      default: 'Default: header, h1, content, actions, contact',
      'with-steps': 'With steps under the header',
      centred: 'Centred narrow column',
    },
    state: {
      loading: 'Loading',
      ready: 'Ready',
      error: 'Error: no steps; the content carries the message',
      blocked: 'Blocked or expired: no steps, contact kept',
    },
  };
}
