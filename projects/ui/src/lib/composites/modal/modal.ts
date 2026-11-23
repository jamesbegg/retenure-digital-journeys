import {
  afterRenderEffect,
  Component,
  ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { ModalPlacement, ModalTone } from '../../interfaces/modal';
import { Button } from '../../primitives/button/button';
import { nextId } from '../../utils/id';

@Component({
  selector: 'ret-modal',
  imports: [Button],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {
  readonly heading = input.required<string>();
  readonly primaryLabel = input.required<string>();
  readonly secondaryLabel = input<string>();
  readonly tone = input<ModalTone>('default');
  readonly placement = input<ModalPlacement>('centre');
  readonly closeLabel = input.required<string>();
  readonly open = model(false);
  readonly primaryPressed = output<void>();
  readonly secondaryPressed = output<void>();

  protected readonly headingId = nextId('ret-modal-heading');
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private opener: HTMLElement | null = null;

  constructor() {
    afterRenderEffect(() => {
      const dialog = this.dialog().nativeElement;
      const open = this.open();
      if (open === dialog.open) return;
      if (!open) {
        dialog.close();
        return;
      }
      this.opener = document.activeElement as HTMLElement | null;
      dialog.showModal();
      // The safe action first when the primary one is destructive.
      const actions = dialog.querySelectorAll<HTMLElement>('.actions button');
      actions[this.tone() === 'danger' ? 0 : actions.length - 1].focus();
    });
  }

  protected closed() {
    this.open.set(false);
    this.opener?.focus();
    this.opener = null;
  }
}
