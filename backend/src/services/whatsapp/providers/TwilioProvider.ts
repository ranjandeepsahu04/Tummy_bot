import axios from 'axios';
import { IWhatsAppProvider, SendMessageOptions } from './IWhatsAppProvider';
import { env } from '../../../config/env';

export class TwilioProvider implements IWhatsAppProvider {
  async sendMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    const fromNumber = env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

    if (!accountSid || !authToken) {
      console.warn('[TwilioProvider] Twilio credentials missing. Logging output.');
      console.log(`[OUTBOUND TWILIO WHATSAPP to ${options.to}]:\n${options.body}`);
      return { success: true, messageId: `mock_twilio_${Date.now()}` };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const toWhatsApp = options.to.startsWith('whatsapp:') ? options.to : `whatsapp:${options.to}`;

    const params = new URLSearchParams();
    params.append('From', fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`);
    params.append('To', toWhatsApp);
    params.append('Body', options.body);
    if (typeof options.mediaUrl === 'string') {
      params.append('MediaUrl', options.mediaUrl);
    }

    try {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const response = await axios.post(url, params.toString(), {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return { success: true, messageId: response.data.sid };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error('[TwilioProvider] Error sending message:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }
}
