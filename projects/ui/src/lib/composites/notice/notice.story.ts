import { KeyValuePipe } from '@angular/common';
import { Component } from '@angular/core';
import { Variants } from '../../interfaces/story';
import { Notice } from './notice';

@Component({
  selector: 'ret-notice-story',
  imports: [Notice, KeyValuePipe],
  templateUrl: './notice.story.html',
})
export class NoticeStory {
  protected readonly variants: Variants<Notice> = {
    tone: {
      info: 'Information, announced politely',
      success: 'Something went well, announced politely',
      warning: 'Needs attention, announced as an alert',
      danger: 'A problem, announced as an alert',
      neutral: 'Supporting note, announced politely',
    },
    live: {
      off: 'Static: not announced (default)',
      polite: 'Polite: announced as a status when it appears',
      assertive: 'Assertive: announced at once as an alert',
    },
  };
}
