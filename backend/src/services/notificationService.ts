import { getWhatsAppProvider } from './whatsapp/providers';
import { UpiQrGenerator } from './payment/upiQrGenerator';
import { prisma } from '../db/prisma';
import QRCode from 'qrcode';

export class NotificationService {
  public static async notifyOrderStatus(orderId: string, toStatus: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        restaurant: true,
        orderItems: true
      }
    });

    if (!order || !order.user) return;

    const whatsappNumber = order.user.whatsappNumber;
    const provider = getWhatsAppProvider();
    let message = '';
    let mediaUrl: any = undefined;

    const upiId = order.restaurant.upiId || 'tummystation@upi';
    const upiName = order.restaurant.upiName || order.restaurant.name;
    const upiString = UpiQrGenerator.generateUpiString({
      upiId,
      payeeName: upiName,
      amount: order.finalAmount,
      orderNumber: order.orderNumber
    });

    switch (toStatus) {
      case 'ACCEPTED':
        await prisma.order.update({
          where: { id: orderId },
          data: { upiQrData: upiString }
        });

        try {
          mediaUrl = await QRCode.toBuffer(upiString, { width: 400, margin: 2 });
        } catch (err) {
          console.error('[NotificationService] QR Code Buffer error:', err);
        }

        message = `✅ *Order Accepted!* (Order #${order.orderNumber})\n\n${order.restaurant.name} has accepted your order!\n\n💰 *Total Amount:* ₹${order.finalAmount.toFixed(2)}\n⏰ *Pickup Slot:* ${order.pickupTimeStr}\n\n💳 *Payment Options:*\n• UPI ID: \`${upiId}\` (${upiName})\n\n⚡ *To Confirm Payment:*\nScan the QR code image above or pay to \`${upiId}\`, then reply *PAID*!`;
        break;

      case 'PREPARING':
        message = `👨‍🍳 *Kitchen is Preparing your Food!* (Order #${order.orderNumber})\n\nPickup Time: ${order.pickupTimeStr}\nTotal Amount: ₹${order.finalAmount.toFixed(2)}\n\nPayment UPI ID: \`${upiId}\`\nReply *PAID* once completed.`;
        break;

      case 'READY_FOR_PAYMENT':
        await prisma.order.update({
          where: { id: orderId },
          data: { upiQrData: upiString }
        });

        try {
          mediaUrl = await QRCode.toBuffer(upiString, { width: 400, margin: 2 });
        } catch (err) {
          console.error('[NotificationService] QR Code Buffer error:', err);
        }

        message = `💳 *PAYMENT REQUIRED* (Order #${order.orderNumber})\n\nYour order is ready! Please scan the QR code image above to complete payment.\n\n*Order Summary:*\n${order.orderItems.map(i => `• ${i.itemName} x ${i.quantity} = ₹${i.totalPrice.toFixed(2)}`).join('\n')}\n\n*Total Amount:* ₹${order.finalAmount.toFixed(2)}\n*Pickup Slot:* ${order.pickupTimeStr}\n\n📲 *Payment Details:*\n• UPI ID: \`${upiId}\` (${upiName})\n\n⚡ *To Confirm Payment:*\nReply with *PAID* after making payment.`;
        break;

      case 'PAYMENT_RECEIVED':
        message = `🎉 *Payment Confirmed!* (Order #${order.orderNumber})\n\nWe have received your payment of ₹${order.finalAmount.toFixed(2)}.\nYour order is now being packed for pickup!`;
        break;

      case 'READY_FOR_PICKUP':
        message = `🎁 *Ready for Pickup!* (Order #${order.orderNumber})\n\nYour order at ${order.restaurant.name} is ready for pickup!\nSlot: ${order.pickupTimeStr}\nAddress: ${order.restaurant.address}`;
        break;

      case 'COMPLETED':
        message = `🌟 *Order Completed!* (Order #${order.orderNumber})\n\nThank you for ordering with us. Bon appétit!\nType *reorder* or *hi* anytime to place another order.`;
        break;

      case 'CANCELLED':
      case 'REJECTED':
        message = `❌ *Order ${toStatus}* (Order #${order.orderNumber})\n\nYour order has been ${toStatus.toLowerCase()}.\nIf you have any questions, type *help* to contact support.`;
        break;

      default:
        message = `ℹ️ Order #${order.orderNumber} status updated to: ${toStatus}`;
    }

    const sendRes = await provider.sendMessage({
      to: whatsappNumber,
      body: message,
      mediaUrl
    });

    // Log notification
    await prisma.notification.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        type: `ORDER_${toStatus}`,
        content: message,
        status: sendRes.success ? 'SENT' : 'FAILED',
        whatsappMessageId: sendRes.messageId
      }
    });
  }
}
