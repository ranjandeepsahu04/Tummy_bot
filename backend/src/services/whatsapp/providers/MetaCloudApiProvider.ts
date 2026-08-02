import axios from 'axios';
import { IWhatsAppProvider, SendMessageOptions } from './IWhatsAppProvider';
import { env } from '../../../config/env';

export class MetaCloudApiProvider implements IWhatsAppProvider {
  async sendMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const phoneNumberId = env.META_PHONE_NUMBER_ID;
    const token = env.META_WHATSAPP_TOKEN;

    if (!phoneNumberId || !token) {
      console.warn('[MetaCloudApiProvider] Meta API credentials missing (META_PHONE_NUMBER_ID / META_WHATSAPP_TOKEN). Simulating outbound message in logs.');
      console.log(`[OUTBOUND WHATSAPP to ${options.to}]:\n${options.body}${options.mediaUrl ? `\n[Media: ${options.mediaUrl}]` : ''}`);
      return { success: true, messageId: `mock_meta_${Date.now()}` };
    }

    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    // Clean recipient phone number (remove + or non-digits)
    const cleanedTo = options.to.replace(/\D/g, '');

    try {
      let payload: any;

      if (options.mediaUrl) {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanedTo,
          type: 'image',
          image: {
            link: options.mediaUrl,
            caption: options.body
          }
        };
      } else {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanedTo,
          type: 'text',
          text: {
            preview_url: false,
            body: options.body
          }
        };
      }

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const messageId = response.data?.messages?.[0]?.id;
      return { success: true, messageId };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      console.error('[MetaCloudApiProvider] Error sending message:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }
}
