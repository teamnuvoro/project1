/**
 * Unique Digital Outreach (UDO) WhatsApp Business API Service
 * 
 * This service handles sending WhatsApp messages via UDO API
 * using pre-approved templates with variables only.
 */

interface UDOTemplateRequest {
  from: string;
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components: Array<{
      type: 'body';
      parameters: Array<{
        type: 'text';
        text: string;
      }>;
    }>;
  };
}

interface UDOResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class UDOWhatsAppService {
  private apiKey: string;
  private fromNumber: string;
  private baseUrl: string = 'https://api.uniquedigitaloutreach.com/v1/whatsapp';

  constructor() {
    this.apiKey = process.env.UDO_API_KEY || '';
    const rawFromNumber = process.env.UDO_WHATSAPP_NUMBER || '';
    // Clean the from number (remove + prefix and format for UDO API)
    this.fromNumber = this.cleanPhoneNumber(rawFromNumber);
    
    if (!this.apiKey || !this.fromNumber) {
      console.warn('[UDO WhatsApp] API key or phone number not configured. Set UDO_API_KEY and UDO_WHATSAPP_NUMBER env variables.');
    } else {
      console.log('[UDO WhatsApp] Service initialized');
      console.log(`[UDO WhatsApp] Using from number: ${this.fromNumber}`);
    }
  }

  /**
   * Send a WhatsApp message using a pre-approved template
   * 
   * @param to - Phone number with country code (e.g., "91XXXXXXXXXX")
   * @param templateName - Name of the pre-approved template in UDO dashboard
   * @param templateVariables - Array of variables to substitute in the template (in order)
   * @param languageCode - Language code (default: "en")
   * @returns Promise with response indicating success/failure
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    templateVariables: string[] = [],
    languageCode: string = 'en'
  ): Promise<UDOResponse> {
    try {
      if (!this.apiKey || !this.fromNumber) {
        throw new Error('UDO API key or phone number not configured');
      }

      // Clean phone number (remove +, spaces, ensure it starts with country code)
      const cleanTo = this.cleanPhoneNumber(to);

      // Build request body
      const requestBody: UDOTemplateRequest = {
        from: this.fromNumber,
        to: cleanTo,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          components: [
            {
              type: 'body',
              parameters: templateVariables.map((variable) => ({
                type: 'text',
                text: variable,
              })),
            },
          ],
        },
      };

      // Make API call
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('[UDO WhatsApp] API Error:', response.status, responseData);
        return {
          success: false,
          error: responseData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      console.log(`[UDO WhatsApp] Template message sent to ${cleanTo} using template "${templateName}"`);
      
      return {
        success: true,
        messageId: responseData.id || responseData.messageId || undefined,
      };
    } catch (error: any) {
      console.error('[UDO WhatsApp] Error sending template message:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Clean and format phone number for UDO API
   * Removes +, spaces, and ensures it starts with country code
   * UDO API expects: 91XXXXXXXXXX (no + prefix, just digits with country code)
   */
  private cleanPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-digit characters (spaces, dashes, parentheses, +, etc.)
    let cleaned = phone.replace(/\D/g, '');
    
    // If number starts with 0, remove it (Indian local format)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Ensure it starts with country code (default to 91 for India if no country code)
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.fromNumber);
  }
}

export const udoWhatsAppService = new UDOWhatsAppService();

