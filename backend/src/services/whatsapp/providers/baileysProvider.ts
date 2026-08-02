import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  WASocket
} from '@whiskeysockets/baileys';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import { IWhatsAppProvider, SendMessageOptions } from './IWhatsAppProvider';
import { BotFlowHandler } from '../botFlowHandler';
import path from 'path';

let socket: WASocket | null = null;
let currentQrDataUrl: string = '';
let connectionState: string = 'DISCONNECTED';

function extractTextMessage(msg: any): string | null {
  if (!msg || !msg.message) return null;
  const m = msg.message;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.ephemeralMessage?.message?.conversation ||
    m.ephemeralMessage?.message?.extendedTextMessage?.text ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.templateButtonReplyMessage?.selectedId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    null
  );
}

export class BaileysProvider implements IWhatsAppProvider {
  public static getQrDataUrl() {
    return currentQrDataUrl;
  }

  public static getConnectionState() {
    return connectionState;
  }

  public static async initialize() {
    if (socket) return;

    try {
      const authPath = path.join(process.cwd(), 'baileys_auth');
      const { state, saveCreds } = await useMultiFileAuthState(authPath);
      const { version } = await fetchLatestBaileysVersion();

      connectionState = 'CONNECTING';

      socket = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['TummyBot Food Station', 'Chrome', '1.0.0']
      });

      socket.ev.on('creds.update', saveCreds);

      socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          connectionState = 'SCAN_QR_REQUIRED';
          console.log('\n=======================================================');
          console.log('📲 SCAN THIS QR CODE WITH YOUR SECONDARY WHATSAPP PHONE:');
          console.log('=======================================================');
          qrcodeTerminal.generate(qr, { small: true });
          currentQrDataUrl = await QRCode.toDataURL(qr);
        }

        if (connection === 'close') {
          const reason = (lastDisconnect?.error as any)?.output?.statusCode;
          console.log('[Baileys] Connection closed, reason:', reason);

          if (reason !== DisconnectReason.loggedOut) {
            console.log('[Baileys] Reconnecting...');
            socket = null;
            setTimeout(() => BaileysProvider.initialize(), 3000);
          } else {
            connectionState = 'LOGGED_OUT';
            console.log('[Baileys] Session logged out.');
            socket = null;
          }
        } else if (connection === 'open') {
          connectionState = 'CONNECTED';
          currentQrDataUrl = '';
          console.log('\n=======================================================');
          console.log('🎉 SECONDARY PHONE CONNECTED SUCCESSFULLY TO TUMMYBOT!');
          console.log('📲 Anyone can now text "Hi" to this number on WhatsApp!');
          console.log('=======================================================\n');
        }
      });

      socket.ev.on('messages.upsert', async (m) => {
        for (const msg of m.messages) {
          if (msg.key.fromMe) continue; // Skip messages sent by the bot itself

          const remoteJid = msg.key.remoteJid;
          if (!remoteJid || remoteJid.includes('status@broadcast')) continue;

          const textMessage = extractTextMessage(msg);
          console.log(`[Baileys Incoming Raw Event] JID: ${remoteJid} | Text: "${textMessage || 'Non-text'}"`);

          if (!textMessage) continue;

          // Normalize phone JID
          const rawId = remoteJid.split('@')[0];
          const cleanPhone = rawId.includes(':') ? rawId.split(':')[0] : rawId;
          const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : '+' + cleanPhone;

          console.log(`[Baileys Processing] Inbound from ${formattedPhone}: "${textMessage}"`);

          try {
            const replyText = await BotFlowHandler.handleIncomingMessage(formattedPhone, textMessage);
            if (socket) {
              await socket.sendMessage(remoteJid, { text: replyText });
              console.log(`[Baileys Outbound Success] Sent reply to ${remoteJid}`);
            }
          } catch (err: any) {
            console.error('[Baileys Bot Response Error]:', err);
          }
        }
      });
    } catch (err) {
      console.error('[Baileys Init Error]:', err);
      connectionState = 'ERROR';
    }
  }

  public async sendMessage(payload: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!socket) {
      console.error('[Baileys SendMessage Error] Socket is null / not connected');
      return { success: false, error: 'Baileys client not initialized or connected' };
    }

    try {
      const cleanTo = payload.to.replace(/\+/g, '').replace(/whatsapp:/g, '').replace(/\s+/g, '').trim();
      const jid = cleanTo.includes('@') ? cleanTo : `${cleanTo}@s.whatsapp.net`;

      console.log(`[Baileys Outbound SendMessage] Sending to ${jid}...`);
      let sent;
      if (payload.mediaUrl) {
        let imageBuffer: Buffer;
        if (typeof payload.mediaUrl === 'string' && payload.mediaUrl.startsWith('data:image')) {
          const base64Data = payload.mediaUrl.replace(/^data:image\/\w+;base64,/, '');
          imageBuffer = Buffer.from(base64Data, 'base64');
        } else if (Buffer.isBuffer(payload.mediaUrl)) {
          imageBuffer = payload.mediaUrl;
        } else if (typeof payload.mediaUrl === 'string' && require('fs').existsSync(payload.mediaUrl)) {
          imageBuffer = require('fs').readFileSync(payload.mediaUrl);
        } else {
          imageBuffer = Buffer.from(payload.mediaUrl as any);
        }

        sent = await socket.sendMessage(jid, { image: imageBuffer, caption: payload.body });
      } else {
        sent = await socket.sendMessage(jid, { text: payload.body });
      }

      console.log(`[Baileys Outbound SendMessage] Sent successfully to ${jid}, msgID: ${sent?.key.id}`);
      return {
        success: true,
        messageId: sent?.key.id || undefined
      };
    } catch (err: any) {
      console.error('[Baileys SendMessage Exception]:', err);
      return {
        success: false,
        error: err.message
      };
    }
  }
}
