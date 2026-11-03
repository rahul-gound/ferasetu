/**
 * Normalizes text for matching.
 * @param {string} str
 * @returns {string}
 */
function normalize(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
}

/**
 * FeraSetu WhatsApp AI Message Processor
 * Strictly grounded in store catalog. Never invents prices or stock.
 */
export class WhatsAppAiProcessor {
  /**
   * Evaluates incoming message and produces grounded response.
   *
   * @param {string} incomingText
   * @param {object} context
   * @returns {Promise<{
   *   replyText: string | null,
   *   intent: 'inquiry' | 'product_question' | 'order_request' | 'general' | 'handover',
   *   requiresAttention: boolean,
   *   attentionReason?: string,
   *   isOrderRequest: boolean,
   *   orderItems?: Array<{ product_id: string, product_name: string, quantity: number, unit_price: number }>,
   *   estimatedTotal?: number
   * }>}
   */
  static async processMessage(incomingText, context) {
    const text = String(incomingText || '').trim();
    if (!text) {
      return {
        replyText: null,
        intent: 'general',
        requiresAttention: false,
        isOrderRequest: false,
      };
    }

    // 1. Check if AI replies are globally or chat-level paused
    if (!context.isAiRepliesEnabled || context.isAiPausedForChat) {
      return {
        replyText: null,
        intent: 'general',
        requiresAttention: false,
        isOrderRequest: false,
      };
    }

    const normText = normalize(text);
    const symbol = context.currencySymbol || '₹';
    const catalog = Array.isArray(context.catalog) ? context.catalog : [];

    // 2. Escalation / Handover triggers (complaint, damage, urgent call, refund, human request)
    const isEscalation = /(talk to owner|speak to human|real person|manager|complaint|damaged|refund|fraud|scam|call me|urgent|shikayat|baat karni hai|asli aadmi|malik se baat)/i.test(text);
    if (isEscalation) {
      return {
        replyText: `Namaste! I have forwarded your message to our shopkeeper. They will review this and get back to you shortly.`,
        intent: 'handover',
        requiresAttention: true,
        attentionReason: 'Customer requested human handover or reported an issue',
        isOrderRequest: false,
      };
    }

    // 3. Greeting detection
    if (/^(hi|hello|hey|namaste|pranam|ram ram|salaam|good morning|good evening)$/i.test(normText)) {
      const topProducts = catalog.slice(0, 3).map(p => {
        const effectivePrice = p.sale_price != null ? p.sale_price : p.price;
        return `• ${p.name} (${symbol}${effectivePrice})`;
      }).join('\n');

      const greetingReply = topProducts.length > 0
        ? `Namaste! Welcome to ${context.storeName}. How can we help you today?\n\nPopular items in our shop:\n${topProducts}\n\nFeel free to ask for prices, product details, or place an order!`
        : `Namaste! Welcome to ${context.storeName}. How can we help you today? Ask us about our products or place an order request.`;

      return {
        replyText: greetingReply,
        intent: 'inquiry',
        requiresAttention: false,
        isOrderRequest: false,
      };
    }

    // 4. Order request detection
    const isOrderIntent = /(i want to buy|want to order|send me|book|order|chahiye|mangwana hai|bhejo|pack kar do|deliver to|kripya bhejein)/i.test(text);
    if (isOrderIntent) {
      const matchedItems = [];
      let total = 0;

      for (const prod of catalog) {
        const prodWords = normalize(prod.name).split(/\s+/).filter(w => w.length > 2);
        const matches = prodWords.some(w => normText.includes(w));
        if (matches) {
          const qtyRegex = new RegExp(`(\\d+)\\s*(?:kg|g|pack|box|piece|packet|bottles?|units?)?\\s*(?:of\\s*)?${prodWords[0]}`, 'i');
          const qtyMatch = text.match(qtyRegex);
          const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
          const unitPrice = prod.sale_price != null ? prod.sale_price : prod.price;

          matchedItems.push({
            product_id: prod.id,
            product_name: prod.name,
            quantity: Math.max(1, quantity),
            unit_price: unitPrice,
          });
          total += unitPrice * Math.max(1, quantity);
        }
      }

      if (matchedItems.length > 0) {
        const itemList = matchedItems.map(item => `• ${item.product_name} x ${item.quantity} (${symbol}${item.unit_price * item.quantity})`).join('\n');
        const reply = `Thank you! I have recorded your order request:\n\n${itemList}\n\nEstimated Total: ${symbol}${total}\n\n*Status: Pending Confirmation*\nOur shopkeeper has been notified and will confirm availability, payment, and delivery shortly!`;

        return {
          replyText: reply,
          intent: 'order_request',
          requiresAttention: true,
          attentionReason: 'New order request captured',
          isOrderRequest: true,
          orderItems: matchedItems,
          estimatedTotal: total,
        };
      } else {
        return {
          replyText: `We would be happy to help you with your order! Could you please specify the exact product name from ${context.storeName}? You can also ask "What products do you have?" to see our catalog.`,
          intent: 'inquiry',
          requiresAttention: false,
          isOrderRequest: false,
        };
      }
    }

    // 5. Product catalog query / Price inquiry
    const matchedProducts = [];
    for (const prod of catalog) {
      const prodNameNorm = normalize(prod.name);
      const prodWords = prodNameNorm.split(/\s+/).filter(w => w.length > 2);
      if (normText.includes(prodNameNorm) || prodWords.some(w => normText.includes(w))) {
        matchedProducts.push(prod);
      }
    }

    if (matchedProducts.length > 0) {
      const details = matchedProducts.slice(0, 4).map(p => {
        const effectivePrice = p.sale_price != null ? p.sale_price : p.price;
        const stockStatus = p.stock_quantity > 0 ? `In Stock (${p.stock_quantity} available)` : `Currently Out of Stock`;
        const desc = p.description ? `\n  _${p.description}_` : '';
        return `• *${p.name}*: ${symbol}${effectivePrice} — ${stockStatus}${desc}`;
      }).join('\n\n');

      const reply = `Here is the information from ${context.storeName}:\n\n${details}\n\nTo place an order, simply reply with the quantity you need!`;

      return {
        replyText: reply,
        intent: 'product_question',
        requiresAttention: false,
        isOrderRequest: false,
      };
    }

    // 6. Generic catalog browse
    if (/(what do you have|catalog|menu|items|list|all products|show products|kya hai|kya milta hai|rate list|list bhejo)/i.test(normText)) {
      if (catalog.length === 0) {
        return {
          replyText: `Namaste! We are currently updating our product catalog for ${context.storeName}. Please check back shortly or let us know what you're looking for!`,
          intent: 'inquiry',
          requiresAttention: false,
          isOrderRequest: false,
        };
      }

      const catalogPreview = catalog.slice(0, 6).map(p => {
        const effectivePrice = p.sale_price != null ? p.sale_price : p.price;
        return `• *${p.name}* — ${symbol}${effectivePrice}`;
      }).join('\n');

      return {
        replyText: `Here are some products available at ${context.storeName}:\n\n${catalogPreview}\n\nAsk for any item's price or reply with what you'd like to order!`,
        intent: 'inquiry',
        requiresAttention: false,
        isOrderRequest: false,
      };
    }

    // 7. Fallback for unhandled queries
    return {
      replyText: `Thank you for your message! I'm your FeraSetu assistant for ${context.storeName}. I couldn't find a direct match for "${text}" in our current price list. I have notified the shopkeeper so they can assist you directly!`,
      intent: 'general',
      requiresAttention: true,
      attentionReason: `Unmatched customer query: "${text.slice(0, 60)}"`,
      isOrderRequest: false,
    };
  }
}
