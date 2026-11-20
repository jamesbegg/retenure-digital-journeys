import { KeyValuePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Variants } from '../../interfaces/story';
import { TextField } from './text-field';

@Component({
  selector: 'ret-text-field-story',
  imports: [TextField, KeyValuePipe, ReactiveFormsModule],
  templateUrl: './text-field.story.html',
})
export class TextFieldStory {
  protected readonly variants: Variants<TextField> = {
    type: {
      text: 'Single line',
      multiline: 'Grows with the answer',
      money: 'Pounds, formatted on blur',
      date: 'Day, month and year',
      email: 'Email address',
      tel: 'Phone number',
    },
    size: { md: 'Medium, studio', lg: 'Large, client default' },
    readonly: 'Read-only',
  };

  protected readonly filled = new FormControl('Retire at 60', { nonNullable: true });
  protected readonly disabled = new FormControl({ value: 'Helen Hartwell', disabled: true });
}
