import { IWhatsAppProvider } from './IWhatsAppProvider';
import { BaileysProvider } from './baileysProvider';

export function getWhatsAppProvider(): IWhatsAppProvider {
  return new BaileysProvider();
}

export * from './IWhatsAppProvider';
export * from './baileysProvider';
