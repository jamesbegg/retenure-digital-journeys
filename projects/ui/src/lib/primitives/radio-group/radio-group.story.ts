import { KeyValuePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RadioGroupValue, RadioOption } from '../../interfaces/radio-group';
import { Variants } from '../../interfaces/story';
import { RadioGroup } from './radio-group';

@Component({
  selector: 'ret-radio-group-story',
  imports: [RadioGroup, KeyValuePipe, ReactiveFormsModule],
  templateUrl: './radio-group.story.html',
})
export class RadioGroupStory {
  protected readonly variants: Variants<RadioGroup> = {
    size: { md: 'Medium, studio', lg: 'Large, client default' },
  };

  protected readonly options: RadioOption[] = [
    { value: 'same', label: 'About the same', hint: 'Within a few hundred pounds' },
    { value: 'more', label: 'More', input: { label: 'How much more each month?', type: 'money' } },
    { value: 'less', label: 'Less' },
    {
      value: 'other',
      label: 'Something else',
      input: { label: 'Tell us more', type: 'multiline' },
    },
  ];

  protected readonly chosen = new FormControl<RadioGroupValue | null>({
    value: 'more',
    input: '250',
  });
  protected readonly disabled = new FormControl<RadioGroupValue | null>({
    value: { value: 'less' },
    disabled: true,
  });
}
