import { KeyValuePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Variants } from '../../interfaces/story';
import { Button } from '../../primitives/button/button';
import { Modal } from './modal';

@Component({
  selector: 'ret-modal-story',
  imports: [Modal, Button, KeyValuePipe],
  templateUrl: './modal.story.html',
})
export class ModalStory {
  protected readonly variants: Variants<Modal> = {
    tone: {
      default: 'Default: a question with a primary action',
      danger: 'Danger: the primary action is destructive, focus starts on the safe one',
    },
    open: 'Open: shown as a native modal dialog',
  };

  protected readonly opened = signal<string | null>(null);
}
