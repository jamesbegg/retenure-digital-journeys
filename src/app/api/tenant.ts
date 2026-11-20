import { BrandColours, TenantResponse } from '../interfaces/tenant';
import { Reader } from './reader';

const tenantIdPattern = /^[a-z0-9][a-z0-9-]{0,62}$/;
const colourPattern = /^#[0-9a-f]{6}$/i;
const fontFamilyPattern = /^[\p{L}\p{N} -]+$/u;

function colours(reader: Reader): BrandColours {
  return {
    primary: reader.matching('primary', colourPattern),
    onPrimary: reader.matching('onPrimary', colourPattern),
  };
}

export function parseTenantResponse(json: unknown): TenantResponse {
  const body = Reader.from(json, 'tenantResponse');
  const tenant = body.object('tenant');
  const tenantId = tenant.matching('tenantId', tenantIdPattern);
  // Same-origin paths under this tenant's own prefix only: no other host, data: URL or dot segment.
  const assetPattern = new RegExp(`^/t/${tenantId}(/(?!\\.\\.?(/|$))[A-Za-z0-9._-]+)+$`);
  const logo = tenant.object('logo');
  const theme = tenant.object('colours');
  const font = tenant.has('font') ? tenant.object('font') : undefined;
  return {
    schemaVersion: body.schemaVersion(),
    tenant: {
      tenantId,
      displayName: tenant.string('displayName'),
      logo: { src: logo.matching('src', assetPattern), alt: logo.string('alt') },
      favicon: tenant.matching('favicon', assetPattern),
      colours: { light: colours(theme.object('light')), dark: colours(theme.object('dark')) },
      ...(font && {
        font: {
          family: font.matching('family', fontFamilyPattern),
          src: font.matching('src', assetPattern),
        },
      }),
    },
  };
}
