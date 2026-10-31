export class WorkerEmailClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/email/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async sendEmail(options: {
    templateKey?: string;
    to: string;
    templateData?: Record<string, any>;
    locale?: string;
    subject?: string;
    html?: string;
    text?: string;
    replyTo?: string;
    idempotencyKey?: string;
    priority?: string;
    customHeaders?: Record<string, string>;
    storeSlug?: string;
    orgName?: string;
  }): Promise<{ success: boolean; result: any }> {
    const response = await fetch(`${this.baseUrl}/api/email/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.json() as any;
    
    if (!response.ok) {
      throw new Error(data.error || `Worker email API error: ${response.status}`);
    }

    return { success: true, result: data.result };
  }
}

export async function sendEmailViaWorker(
  baseUrl: string,
  apiKey: string,
  options: {
    templateKey?: string;
    to: string;
    templateData?: Record<string, any>;
    locale?: string;
  }
): Promise<void> {
  const client = new WorkerEmailClient(baseUrl, apiKey);
  await client.sendEmail(options);
}