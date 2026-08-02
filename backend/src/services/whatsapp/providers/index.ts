import { IWhatsAppProvider } from './IWhatsAppProvider';
import { MetaCloudApiProvider } from './MetaCloudApiProvider';
import { TwilioProvider } from './TwilioProvider';
import { BaileysProvider } from './baileysProvider';
import { env } from '../../../config/env';

export function getWhatsAppProvider(): IWhatsAppProvider {
  if (env.WHATSAPP_PROVIDER === 'baileys') {
    return new BaileysProvider();
  }
  if (env.WHATSAPP_PROVIDER === 'twilio') {
    return new TwilioProvider();
  }
  return new MetaCloudApiProvider();
}

export * from './IWhatsAppProvider';
export * from './baileysProvider';
