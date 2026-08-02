export interface SendMessageOptions {
  to: string;
  body: string;
  mediaUrl?: string | Buffer;
}

export interface IWhatsAppProvider {
  sendMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;
}
