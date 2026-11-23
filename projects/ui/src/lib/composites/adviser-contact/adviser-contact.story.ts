import { KeyValuePipe } from '@angular/common';
import { Component } from '@angular/core';
import { Variants } from '../../interfaces/story';
import { AdviserContact } from './adviser-contact';

@Component({
  selector: 'ret-adviser-contact-story',
  imports: [AdviserContact, KeyValuePipe],
  templateUrl: './adviser-contact.story.html',
})
export class AdviserContactStory {
  protected readonly variants: Variants<AdviserContact> = {
    variant: {
      full: 'Full: name, role, contact line, email and phone',
      compact: 'Compact: contact line and an email button, under a screen',
    },
  };
}
