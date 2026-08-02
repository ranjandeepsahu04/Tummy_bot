import { prisma } from '../../db/prisma';

export interface CartItem {
  foodItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface SessionData {
  whatsappNumber: string;
  currentStep: string;
  selectedZoneId?: string | null;
  selectedBlockId?: string | null;
  selectedRestaurantId?: string | null;
  selectedCategoryId?: string | null;
  cart: CartItem[];
  couponCode?: string | null;
  selectedPickupSlotId?: string | null;
  context: Record<string, any>;
}

// In-Memory RAM Session Store for instant <5ms responses
const ramSessionStore = new Map<string, SessionData>();

export class SessionEngine {
  public static async getOrCreateSession(whatsappNumber: string): Promise<SessionData> {
    // Check RAM cache first
    const inMemory = ramSessionStore.get(whatsappNumber);
    if (inMemory) return inMemory;

    // Ensure User record exists
    let user = await prisma.user.findUnique({
      where: { whatsappNumber }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          whatsappNumber,
          name: `Customer ${whatsappNumber.slice(-4)}`
        }
      });
    }

    let session = await prisma.whatsAppSession.findUnique({
      where: { whatsappNumber }
    });

    if (!session) {
      session = await prisma.whatsAppSession.create({
        data: {
          whatsappNumber,
          currentStep: 'MAIN_MENU',
          cartJson: '[]',
          contextJson: '{}'
        }
      });
    }

    let cart: CartItem[] = [];
    try {
      cart = JSON.parse(session.cartJson || '[]');
    } catch (e) {
      cart = [];
    }

    let context: Record<string, any> = {};
    try {
      context = JSON.parse(session.contextJson || '{}');
    } catch (e) {
      context = {};
    }

    const sessionData: SessionData = {
      whatsappNumber: session.whatsappNumber,
      currentStep: session.currentStep,
      selectedZoneId: session.selectedZoneId,
      selectedBlockId: session.selectedBlockId,
      selectedRestaurantId: session.selectedRestaurantId,
      selectedCategoryId: session.selectedCategoryId,
      cart,
      couponCode: session.couponCode,
      selectedPickupSlotId: session.selectedPickupSlotId,
      context
    };

    ramSessionStore.set(whatsappNumber, sessionData);
    return sessionData;
  }

  public static async updateSession(
    whatsappNumber: string,
    updates: Partial<Omit<SessionData, 'whatsappNumber'>>
  ): Promise<void> {
    const current = await this.getOrCreateSession(whatsappNumber);
    const updated: SessionData = { ...current, ...updates };

    ramSessionStore.set(whatsappNumber, updated);

    // Sync asynchronously to database in background
    prisma.whatsAppSession.update({
      where: { whatsappNumber },
      data: {
        currentStep: updated.currentStep,
        selectedZoneId: updated.selectedZoneId,
        selectedBlockId: updated.selectedBlockId,
        selectedRestaurantId: updated.selectedRestaurantId,
        selectedCategoryId: updated.selectedCategoryId,
        cartJson: JSON.stringify(updated.cart),
        couponCode: updated.couponCode,
        selectedPickupSlotId: updated.selectedPickupSlotId,
        contextJson: JSON.stringify(updated.context),
        lastActiveAt: new Date()
      }
    }).catch(err => console.error('[SessionEngine] Async DB sync error:', err));
  }

  public static async resetSession(whatsappNumber: string): Promise<void> {
    const defaultData: SessionData = {
      whatsappNumber,
      currentStep: 'MAIN_MENU',
      selectedZoneId: null,
      selectedBlockId: null,
      selectedRestaurantId: null,
      selectedCategoryId: null,
      cart: [],
      couponCode: null,
      selectedPickupSlotId: null,
      context: {}
    };

    ramSessionStore.set(whatsappNumber, defaultData);

    prisma.whatsAppSession.update({
      where: { whatsappNumber },
      data: {
        currentStep: 'MAIN_MENU',
        selectedZoneId: null,
        selectedBlockId: null,
        selectedRestaurantId: null,
        selectedCategoryId: null,
        cartJson: '[]',
        couponCode: null,
        selectedPickupSlotId: null,
        contextJson: '{}',
        lastActiveAt: new Date()
      }
    }).catch(err => console.error('[SessionEngine] Async DB sync error:', err));
  }
}
