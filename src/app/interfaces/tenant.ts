export interface BrandColours {
  primary: string;
  onPrimary: string;
}

export interface TenantTheme {
  tenantId: string;
  displayName: string;
  logo: { src: string; alt: string };
  favicon: string;
  colours: { light: BrandColours; dark: BrandColours };
  font?: { family: string; src: string };
}

export interface TenantResponse {
  schemaVersion: 1;
  tenant: TenantTheme;
}
