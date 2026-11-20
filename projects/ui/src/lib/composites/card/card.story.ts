import { KeyValuePipe } from '@angular/common';
import { Component } from '@angular/core';
import { Variants } from '../../interfaces/story';
import { Card } from './card';

@Component({
  selector: 'ret-card-story',
  imports: [Card, KeyValuePipe],
  templateUrl: './card.story.html',
})
export class CardStory {
  protected readonly variants: Variants<Card> = {
    variant: {
      default: 'Default: surface and padding, no border',
      active: 'Active: the card being answered',
      answered: 'Answered: summary with an Edit button',
      muted: 'Muted: supporting content',
    },
    disabled: 'Disabled: answer readable, Edit unavailable',
  };
}
