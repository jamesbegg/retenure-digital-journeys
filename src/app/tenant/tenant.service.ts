import { HttpClient } from '@angular/common/http';
import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { parseTenantResponse } from '../api/tenant';
import { TenantTheme } from '../interfaces/tenant';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly neutralTitle = this.document.title;
  private readonly neutralFavicon = this.icon()?.getAttribute('href') ?? null;

  readonly theme = signal<TenantTheme | null>(null);
  readonly failed = signal(false);
  readonly tenantId = computed(() => this.theme()?.tenantId ?? null);

  async load(): Promise<void> {
    try {
      const { tenant } = parseTenantResponse(
        await firstValueFrom(this.http.get<unknown>('/client/tenant')),
      );
      this.apply(tenant);
    } catch {
      this.reset();
      this.failed.set(true);
    }
  }

  // Light colours only: the client journey has no dark theme in v1.
  private apply(tenant: TenantTheme): void {
    const style = this.document.documentElement.style;
    style.setProperty('--ret-brand-primary', tenant.colours.light.primary);
    style.setProperty('--ret-brand-on-primary', tenant.colours.light.onPrimary);
    this.document.title = tenant.displayName;
    this.setFavicon(tenant.favicon);
    this.theme.set(tenant);
  }

  reset(): void {
    const style = this.document.documentElement.style;
    style.removeProperty('--ret-brand-primary');
    style.removeProperty('--ret-brand-on-primary');
    this.document.title = this.neutralTitle;
    this.setFavicon(this.neutralFavicon);
    this.theme.set(null);
  }

  private icon(): HTMLLinkElement | null {
    return this.document.head.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  }

  private setFavicon(href: string | null): void {
    const link = this.icon();
    if (href === null) {
      link?.removeAttribute('href');
      return;
    }
    const target = link ?? this.document.head.appendChild(this.document.createElement('link'));
    target.rel = 'icon';
    target.href = href;
  }
}
