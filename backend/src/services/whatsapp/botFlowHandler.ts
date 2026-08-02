import { SessionEngine, SessionData, CartItem } from './sessionEngine';
import { CatalogService } from '../catalogService';
import { OrderService } from '../orderService';
import { getWhatsAppProvider } from './providers';
import { prisma } from '../../db/prisma';
import { OrderStatus } from '../../types/orderStatus';

export class BotFlowHandler {
  public static async handleIncomingMessage(whatsappNumber: string, rawText: string): Promise<string> {
    const text = rawText.trim();
    const lowerText = text.toLowerCase();
    const session = await SessionEngine.getOrCreateSession(whatsappNumber);

    // Global Command Overrides
    if (lowerText === 'hi' || lowerText === 'hello' || lowerText === 'menu' || lowerText === '0') {
      await SessionEngine.resetSession(whatsappNumber);
      return this.renderMainMenu();
    }

    if (lowerText === 'track' || lowerText === 'my order' || lowerText === 'status') {
      return this.handleTrackOrder(whatsappNumber);
    }

    if (lowerText === 'reorder') {
      return this.handleReorderList(whatsappNumber);
    }

    if (lowerText === 'help' || lowerText === 'support') {
      return this.renderHelp();
    }

    if (lowerText === 'paid') {
      return this.handleCustomerPaidMessage(whatsappNumber);
    }

    if (lowerText === 'cart') {
      return this.renderCart(session);
    }

    if (lowerText === 'clear') {
      await SessionEngine.updateSession(whatsappNumber, { cart: [] });
      return `🛒 *Cart Cleared!*\n\nType *1* to Order Food or *hi* to return to the Main Menu.`;
    }

    // State machine router
    switch (session.currentStep) {
      case 'MAIN_MENU':
        return this.handleMainMenuSelection(session, text);

      case 'SELECT_ZONE':
        return this.handleZoneSelection(session, text);

      case 'SELECT_BLOCK':
        return this.handleBlockSelection(session, text);

      case 'SELECT_RESTAURANT':
        return this.handleRestaurantSelection(session, text);

      case 'SELECT_CATEGORY':
      case 'BROWSE_MENU':
        return this.handleMenuBrowsing(session, text);

      case 'APPLY_COUPON':
        return this.handleCouponInput(session, text);

      case 'SELECT_PICKUP_TIME':
        return this.handlePickupSlotSelection(session, text);

      case 'CONFIRM_ORDER':
        return this.handleOrderConfirmation(session, text);

      case 'SELECT_REORDER':
        return this.handleReorderSelection(session, text);

      default:
        await SessionEngine.resetSession(whatsappNumber);
        return this.renderMainMenu();
    }
  }

  private static renderMainMenu(): string {
    return `👋 *Welcome to WhatsApp Food Station!*\n\nWhat would you like to do today?\n\n1️⃣ *Order Food*\n2️⃣ *Reorder Previous Meal*\n3️⃣ *My Orders / Track Order*\n4️⃣ *Help & Support*\n\n_Reply with 1, 2, 3, or 4_`;
  }

  private static async handleMainMenuSelection(session: SessionData, text: string): Promise<string> {
    if (text === '1') {
      const zones = await CatalogService.getActiveZones();
      if (zones.length === 0) {
        return `⚠️ No active delivery zones available right now. Please check back later.`;
      }

      await SessionEngine.updateSession(session.whatsappNumber, {
        currentStep: 'SELECT_ZONE',
        context: { zones }
      });

      let response = `📍 *Step 1: Select your Zone*\n\n`;
      zones.forEach((z, index) => {
        response += `${index + 1}️⃣ ${z.name}\n`;
      });
      response += `\n_Reply with the number of your zone._`;
      return response;
    }

    if (text === '2') {
      return this.handleReorderList(session.whatsappNumber);
    }

    if (text === '3') {
      return this.handleTrackOrder(session.whatsappNumber);
    }

    if (text === '4') {
      return this.renderHelp();
    }

    return `❓ Invalid option. Please reply with *1*, *2*, *3*, or *4*.\n\n${this.renderMainMenu()}`;
  }

  private static async handleZoneSelection(session: SessionData, text: string): Promise<string> {
    const index = parseInt(text, 10) - 1;
    const zones = session.context.zones || (await CatalogService.getActiveZones());

    if (isNaN(index) || index < 0 || index >= zones.length) {
      return `❌ Invalid selection. Please reply with a valid zone number.`;
    }

    const selectedZone = zones[index];
    const blocks = await CatalogService.getBlocksByZone(selectedZone.id);

    if (blocks.length === 0) {
      return `⚠️ No active blocks found for ${selectedZone.name}. Please select another zone or reply *hi*.`;
    }

    await SessionEngine.updateSession(session.whatsappNumber, {
      currentStep: 'SELECT_BLOCK',
      selectedZoneId: selectedZone.id,
      context: { ...session.context, selectedZone, blocks }
    });

    let response = `🏢 *Step 2: Select your Block / Sector in ${selectedZone.name}*\n\n`;
    blocks.forEach((b, idx) => {
      response += `${idx + 1}️⃣ ${b.name}\n`;
    });
    response += `\n_Reply with block number (or reply *back*)._`;
    return response;
  }

  private static async handleBlockSelection(session: SessionData, text: string): Promise<string> {
    if (text.toLowerCase() === 'back') {
      return this.handleMainMenuSelection(session, '1');
    }

    const index = parseInt(text, 10) - 1;
    const blocks = session.context.blocks || [];

    if (isNaN(index) || index < 0 || index >= blocks.length) {
      return `❌ Invalid selection. Please reply with a valid block number.`;
    }

    const selectedBlock = blocks[index];
    const restaurants = await CatalogService.getRestaurantsByBlock(session.selectedZoneId!, selectedBlock.id);

    if (restaurants.length === 0) {
      return `⚠️ No active restaurants in ${selectedBlock.name} right now. Type *back* to choose another block.`;
    }

    await SessionEngine.updateSession(session.whatsappNumber, {
      currentStep: 'SELECT_RESTAURANT',
      selectedBlockId: selectedBlock.id,
      context: { ...session.context, selectedBlock, restaurants }
    });

    let response = `🍽️ *Step 3: Select Restaurant in ${selectedBlock.name}*\n\n`;
    restaurants.forEach((r, idx) => {
      response += `${idx + 1}️⃣ *${r.name}*\n📍 ${r.address}\n\n`;
    });
    response += `_Reply with restaurant number (or reply *back*)._`;
    return response;
  }

  private static async handleRestaurantSelection(session: SessionData, text: string): Promise<string> {
    if (text.toLowerCase() === 'back') {
      const selectedZone = session.context.selectedZone;
      if (selectedZone) {
        const blocks = await CatalogService.getBlocksByZone(selectedZone.id);
        await SessionEngine.updateSession(session.whatsappNumber, { currentStep: 'SELECT_BLOCK', context: { ...session.context, blocks } });
        let resp = `🏢 *Select your Block in ${selectedZone.name}*\n\n`;
        blocks.forEach((b, idx) => { resp += `${idx + 1}️⃣ ${b.name}\n`; });
        return resp;
      }
      return this.renderMainMenu();
    }

    const index = parseInt(text, 10) - 1;
    const restaurants = session.context.restaurants || [];

    if (isNaN(index) || index < 0 || index >= restaurants.length) {
      return `❌ Invalid selection. Please reply with a valid restaurant number.`;
    }

    const restaurant = restaurants[index];
    const menuCategories = await CatalogService.getMenuForRestaurant(restaurant.id);

    // Flatten menu items with global item index for easy command ordering
    let itemCounter = 1;
    const flatItemsMap: Record<number, any> = {};

    let menuText = `📖 *Menu - ${restaurant.name}*\n\n`;
    menuCategories.forEach(cat => {
      if (cat.foodItems.length === 0) return;
      menuText += `*=== ${cat.name.toUpperCase()} ===*\n`;
      cat.foodItems.forEach((item: any) => {
        flatItemsMap[itemCounter] = item;
        menuText += `*${itemCounter}* - ${item.name} | ₹${item.price.toFixed(2)}\n`;
        if (item.description) menuText += `  _${item.description}_\n`;
        itemCounter++;
      });
      menuText += `\n`;
    });

    menuText += `🛒 *How to add items to Cart:*\n• Send item number (e.g. *5* for 1 qty)\n• Send quantity x number (e.g. *2 x 5* or *3 x 4*)\n• Type *cart* to review items\n• Type *checkout* to complete order\n• Type *back* to change restaurant`;

    await SessionEngine.updateSession(session.whatsappNumber, {
      currentStep: 'BROWSE_MENU',
      selectedRestaurantId: restaurant.id,
      context: { ...session.context, restaurant, flatItemsMap }
    });

    return menuText;
  }

  private static async handleMenuBrowsing(session: SessionData, text: string): Promise<string> {
    const lower = text.toLowerCase();

    if (lower === 'back') {
      const selectedBlock = session.context.selectedBlock;
      if (selectedBlock && session.selectedZoneId) {
        const restaurants = await CatalogService.getRestaurantsByBlock(session.selectedZoneId, selectedBlock.id);
        await SessionEngine.updateSession(session.whatsappNumber, { currentStep: 'SELECT_RESTAURANT', context: { ...session.context, restaurants } });
        let resp = `🍽️ *Select Restaurant in ${selectedBlock.name}*\n\n`;
        restaurants.forEach((r, idx) => { resp += `${idx + 1}️⃣ *${r.name}*\n`; });
        return resp;
      }
      return this.renderMainMenu();
    }

    if (lower === 'checkout') {
      if (session.cart.length === 0) {
        return `🛒 Your cart is empty! Please add items from the menu first.`;
      }
      // Move to Coupon step
      await SessionEngine.updateSession(session.whatsappNumber, { currentStep: 'APPLY_COUPON' });
      return `🎟️ *Have a Coupon Code?*\n\nReply with your code (e.g. *WELCOME10*) or reply *SKIP* to proceed to pickup time selection.`;
    }

    if (lower.startsWith('remove ')) {
      const itemNumStr = lower.replace('remove ', '').trim();
      const itemNum = parseInt(itemNumStr, 10);
      const flatItemsMap = session.context.flatItemsMap || {};
      const targetItem = flatItemsMap[itemNum];

      if (targetItem) {
        const newCart = session.cart.filter(c => c.foodItemId !== targetItem.id);
        await SessionEngine.updateSession(session.whatsappNumber, { cart: newCart });
        return `❌ Removed *${targetItem.name}* from cart.\n\n${await this.renderCart(session)}`;
      }
      return `❓ Item #${itemNumStr} not found in cart.`;
    }

    // Check item selection format: "2 x 5" or "5"
    let qty = 1;
    let itemNum = 0;

    if (text.includes('x') || text.includes('*')) {
      const parts = text.split(/[x*]/i);
      qty = parseInt(parts[0].trim(), 10);
      itemNum = parseInt(parts[1].trim(), 10);
    } else {
      itemNum = parseInt(text, 10);
    }

    const flatItemsMap = session.context.flatItemsMap || {};
    const item = flatItemsMap[itemNum];

    if (!item || isNaN(qty) || qty <= 0) {
      return `❓ Unrecognized command or invalid item number.\n\nReply with item number (e.g. *3*), quantity command (e.g. *2 x 3*), *cart*, *checkout*, or *back*.`;
    }

    // Add to cart
    const currentCart = [...session.cart];
    const existingIndex = currentCart.findIndex(c => c.foodItemId === item.id);

    if (existingIndex >= 0) {
      currentCart[existingIndex].quantity += qty;
    } else {
      currentCart.push({
        foodItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: qty
      });
    }

    await SessionEngine.updateSession(session.whatsappNumber, { cart: currentCart });

    const totalCartItems = currentCart.reduce((sum, i) => sum + i.quantity, 0);
    return `✅ Added *${qty} x ${item.name}* to cart!\nTotal Cart Items: *${totalCartItems}*\n\nType *cart* to view cart, *checkout* to order, or reply with another item number.`;
  }

  private static async handleCouponInput(session: SessionData, text: string): Promise<string> {
    const textUpper = text.trim().toUpperCase();

    if (textUpper !== 'SKIP') {
      const cartTotal = session.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      const validation = await CatalogService.validateCoupon(textUpper, cartTotal);

      if (!validation.valid) {
        return `❌ ${validation.message}\n\nPlease try another code or reply *SKIP*.`;
      }

      await SessionEngine.updateSession(session.whatsappNumber, { couponCode: textUpper });
    }

    // Move to pickup slot selection
    const slots = await CatalogService.getPickupSlotsForRestaurant(session.selectedRestaurantId!);
    await SessionEngine.updateSession(session.whatsappNumber, {
      currentStep: 'SELECT_PICKUP_TIME',
      context: { ...session.context, pickupSlots: slots }
    });

    if (slots.length === 0) {
      // Proceed directly to confirmation if no pickup slots configured
      return this.renderOrderSummary(session);
    }

    let resp = `⏰ *Select Pickup Time Slot*\n\n`;
    slots.forEach((slot, index) => {
      resp += `${index + 1}️⃣ ${slot.slotTime} (${slot.maxOrders - slot.currentOrders} slots left)\n`;
    });
    resp += `\n_Reply with slot number._`;
    return resp;
  }

  private static async handlePickupSlotSelection(session: SessionData, text: string): Promise<string> {
    const index = parseInt(text, 10) - 1;
    const slots = session.context.pickupSlots || [];

    if (isNaN(index) || index < 0 || index >= slots.length) {
      return `❌ Invalid pickup slot. Please select a valid slot number.`;
    }

    const selectedSlot = slots[index];
    await SessionEngine.updateSession(session.whatsappNumber, {
      selectedPickupSlotId: selectedSlot.id,
      currentStep: 'CONFIRM_ORDER'
    });

    const updatedSession = await SessionEngine.getOrCreateSession(session.whatsappNumber);
    return this.renderOrderSummary(updatedSession);
  }

  private static async renderOrderSummary(session: SessionData): Promise<string> {
    await SessionEngine.updateSession(session.whatsappNumber, { currentStep: 'CONFIRM_ORDER' });

    const restaurant = session.context.restaurant || (await CatalogService.getRestaurantById(session.selectedRestaurantId!));
    const cartTotal = session.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    let discount = 0;
    if (session.couponCode) {
      const couponVal = await CatalogService.validateCoupon(session.couponCode, cartTotal);
      if (couponVal.valid && couponVal.discountAmount) discount = couponVal.discountAmount;
    }

    const finalTotal = Math.max(0, cartTotal - discount);

    let pickupTime = 'Standard ASAP (30-45 mins)';
    if (session.selectedPickupSlotId) {
      const slot = await prisma.pickupSlot.findUnique({ where: { id: session.selectedPickupSlotId } });
      if (slot) pickupTime = slot.slotTime;
    }

    let summary = `📋 *ORDER CONFIRMATION*\n\n`;
    summary += `*Restaurant:* ${restaurant ? restaurant.name : 'Food Station'}\n`;
    summary += `*Pickup Time:* ${pickupTime}\n\n`;
    summary += `*Items:*\n`;
    session.cart.forEach(i => {
      summary += `• ${i.name} x ${i.quantity} = ₹${(i.price * i.quantity).toFixed(2)}\n`;
    });

    summary += `\nSubtotal: ₹${cartTotal.toFixed(2)}\n`;
    if (discount > 0) summary += `Discount (${session.couponCode}): -₹${discount.toFixed(2)}\n`;
    summary += `*Final Amount:* ₹${finalTotal.toFixed(2)}\n\n`;
    summary += `1️⃣ *Confirm Order*\n2️⃣ *Cancel & Reset*\n\n_Reply 1 to confirm your order._`;

    return summary;
  }

  private static async handleOrderConfirmation(session: SessionData, text: string): Promise<string> {
    if (text === '1' || text.toLowerCase() === 'confirm') {
      try {
        const order = await OrderService.createOrderFromSession(session);
        await SessionEngine.resetSession(session.whatsappNumber);

        let confirmation = `🎉 *Order Placed Successfully!*\n\n`;
        confirmation += `*Order Reference:* #${order.orderNumber}\n`;
        confirmation += `*Status:* PENDING (Awaiting Restaurant Acceptance)\n`;
        confirmation += `*Total:* ₹${order.finalAmount.toFixed(2)}\n\n`;
        confirmation += `🕒 The kitchen will review your order shortly. Once accepted and ready, you will receive a *Payment Link / QR Code* here.\n\nType *track* anytime to check order status.`;

        return confirmation;
      } catch (err: any) {
        return `❌ Failed to place order: ${err.message}. Type *hi* to start over.`;
      }
    }

    if (text === '2' || text.toLowerCase() === 'cancel') {
      await SessionEngine.resetSession(session.whatsappNumber);
      return `❌ Order cancelled.\n\nType *hi* to return to main menu.`;
    }

    return `❓ Please reply with *1* to Confirm or *2* to Cancel.`;
  }

  private static async renderCart(session: SessionData): Promise<string> {
    if (session.cart.length === 0) {
      return `🛒 Your cart is empty!\n\nReply *1* to start ordering food.`;
    }

    let cartText = `🛒 *YOUR SHOPPING CART*\n\n`;
    let subtotal = 0;
    session.cart.forEach((i, idx) => {
      const lineTotal = i.price * i.quantity;
      subtotal += lineTotal;
      cartText += `${idx + 1}. *${i.name}* - ${i.quantity} x ₹${i.price.toFixed(2)} = ₹${lineTotal.toFixed(2)}\n`;
    });

    cartText += `\n*Subtotal:* ₹${subtotal.toFixed(2)}\n\n`;
    cartText += `• Type *checkout* to proceed\n• Type *clear* to reset cart\n• Type *remove <number>* to remove an item`;

    return cartText;
  }

  private static async handleTrackOrder(whatsappNumber: string): Promise<string> {
    const activeOrder = await OrderService.getLatestActiveOrder(whatsappNumber);

    if (!activeOrder) {
      return `🔍 You have no active orders right now.\n\nReply *1* or *hi* to place a new order!`;
    }

    let trackResp = `📦 *ORDER STATUS - #${activeOrder.orderNumber}*\n\n`;
    trackResp += `*Restaurant:* ${activeOrder.restaurant.name}\n`;
    trackResp += `*Status:* ${activeOrder.status}\n`;
    trackResp += `*Payment Status:* ${activeOrder.paymentStatus}\n`;
    trackResp += `*Pickup Time:* ${activeOrder.pickupTimeStr}\n`;
    trackResp += `*Amount:* ₹${activeOrder.finalAmount.toFixed(2)}\n\n`;

    if (activeOrder.status === OrderStatus.READY_FOR_PAYMENT) {
      trackResp += `⚠️ *Action Required:* Your order is ready for payment! Check payment details sent above and reply *PAID* after payment.`;
    } else if (activeOrder.status === OrderStatus.READY_FOR_PICKUP) {
      trackResp += `🥳 Your food is packed and ready for pickup at ${activeOrder.restaurant.address}!`;
    }

    return trackResp;
  }

  private static async handleReorderList(whatsappNumber: string): Promise<string> {
    const recentOrders = await OrderService.getRecentOrders(whatsappNumber, 5);

    if (recentOrders.length === 0) {
      return `📜 You have no previous order history.\n\nReply *1* or *hi* to place your first order!`;
    }

    await SessionEngine.updateSession(whatsappNumber, {
      currentStep: 'SELECT_REORDER',
      context: { recentOrders }
    });

    let resp = `🔄 *REORDER PREVIOUS MEAL*\nSelect an order to quickly reorder:\n\n`;
    recentOrders.forEach((ord, index) => {
      resp += `${index + 1}️⃣ *Order #${ord.orderNumber}* (${ord.restaurant.name})\n`;
      resp += `   Items: ${ord.orderItems.map(i => `${i.quantity}x ${i.itemName}`).join(', ')}\n`;
      resp += `   Total: ₹${ord.finalAmount.toFixed(2)}\n\n`;
    });
    resp += `_Reply with order number to reorder, or reply *hi* to return to main menu._`;

    return resp;
  }

  private static async handleReorderSelection(session: SessionData, text: string): Promise<string> {
    const index = parseInt(text, 10) - 1;
    const recentOrders = session.context.recentOrders || [];

    if (isNaN(index) || index < 0 || index >= recentOrders.length) {
      return `❌ Invalid selection. Please reply with a valid order number from the list.`;
    }

    const selectedOrder = recentOrders[index];

    // Build cart from previous order items
    const newCart: CartItem[] = selectedOrder.orderItems.map((item: any) => ({
      foodItemId: item.foodItemId,
      name: item.itemName,
      price: item.unitPrice,
      quantity: item.quantity
    }));

    await SessionEngine.updateSession(session.whatsappNumber, {
      cart: newCart,
      selectedZoneId: selectedOrder.zoneId,
      selectedBlockId: selectedOrder.blockId,
      selectedRestaurantId: selectedOrder.restaurantId,
      currentStep: 'APPLY_COUPON'
    });

    return `✅ Loaded items from Order #${selectedOrder.orderNumber} into cart!\n\n🎟️ *Have a Coupon Code?*\nReply with code or reply *SKIP* to proceed to pickup time selection.`;
  }

  private static async handleCustomerPaidMessage(whatsappNumber: string): Promise<string> {
    const activeOrder = await OrderService.getLatestActiveOrder(whatsappNumber);

    if (!activeOrder) {
      return `❓ No active order found awaiting payment. Reply *hi* for main menu.`;
    }

    if (activeOrder.status === OrderStatus.READY_FOR_PAYMENT || activeOrder.paymentStatus === 'UNPAID') {
      await OrderService.updateOrderStatus(activeOrder.id, OrderStatus.PAYMENT_RECEIVED, undefined, 'Customer replied PAID');
      return `👍 Thank you! We have flagged payment as received for Order #${activeOrder.orderNumber}.\n\nThe kitchen is preparing your pickup!`;
    }

    return `ℹ️ Order #${activeOrder.orderNumber} is currently in status: ${activeOrder.status}.`;
  }

  private static renderHelp(): string {
    return `❓ *HELP & SUPPORT*\n\n📞 *Customer Hotline:* +91 98765 43210\n📧 *Email:* support@foodstation.com\n\n*Frequently Asked Questions:*\n• *How do I pay?* Wait until kitchen accepts your order and sends the payment link / UPI QR Code.\n• *How to change cart?* Type *cart* or *clear* during menu browsing.\n• *How to track?* Type *track* anytime.\n\nReply *hi* to return to Main Menu.`;
  }
}
