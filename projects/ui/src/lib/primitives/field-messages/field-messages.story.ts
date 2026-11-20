import { Component } from '@angular/core';
import { Variants } from '../../interfaces/story';
import { FieldMessages } from './field-messages';

@Component({
  selector: 'ret-field-messages-story',
  imports: [FieldMessages],
  templateUrl: './field-messages.story.html',
})
export class FieldMessagesStory {
  protected readonly variants: Variants<FieldMessages> = {};
}
