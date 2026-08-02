import QRCode from 'qrcode';

export interface UpiQrParams {
  upiId: string;
  payeeName: string;
  amount: number;
  orderNumber: string;
  note?: string;
}

export class UpiQrGenerator {
  /**
   * Generates standard UPI Payment URI scheme
   * e.g. upi://pay?pa=merchant@upi&pn=Food Station&am=250.00&tn=Order #ORD-1001&tr=ORD-1001&cu=INR
   */
  public static generateUpiString(params: UpiQrParams): string {
    const { upiId, payeeName, amount, orderNumber, note } = params;
    const formattedAmount = amount.toFixed(2);
    const transactionNote = encodeURIComponent(note || `Order #${orderNumber}`);
    const encodedPayee = encodeURIComponent(payeeName);

    return `upi://pay?pa=${upiId}&pn=${encodedPayee}&am=${formattedAmount}&tn=${transactionNote}&tr=${orderNumber}&cu=INR`;
  }

  /**
   * Generates Base64 Data URL Image of QR Code for frontend display / rendering
   */
  public static async generateQrDataUrl(params: UpiQrParams): Promise<string> {
    const upiString = this.generateUpiString(params);
    return await QRCode.toDataURL(upiString, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  }
}
