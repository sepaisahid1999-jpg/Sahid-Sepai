import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, type Content } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MODEL_NAME = 'gemini-4-hydrogen';

type ChatRoleId = 'product_advisor' | 'bulk_quote_helper' | 'logistics_desk';

interface IncomingHistoryItem {
  role: 'user' | 'model';
  text: string;
}

interface PublicProductContextItem {
  name: string;
  sku: string;
  categoryName: string;
  unit: string;
  minOrderQty: number;
  showStockPublicly?: boolean;
  publicAvailableStock?: number;
}

interface PublicContextPayload {
  companyName?: string;
  currencyCode?: string;
  currencySymbol?: string;
  address?: string;
  email?: string;
  contactNumbers?: string[];
  products?: PublicProductContextItem[];
}

const ROLE_INSTRUCTIONS: Record<ChatRoleId, { title: string; prompt: string }> = {
  product_advisor: {
    title: 'Product & GSM Advisor',
    prompt:
      'You are the Wholesale Product & GSM Advisor for Gazi Jute Enterprises. Help B2B buyers compare raw jute grades (such as Tossa TD-3/TD-4 and White W-3), woven hessian/burlap GSM weights, A-Twill and B-Twill gunny sack specifications, and multi-ply jute twine applications. Recommend matching items from the provided public catalogue only.',
  },
  bulk_quote_helper: {
    title: 'Bulk Order & MOQ Planner',
    prompt:
      'You are the Bulk Order & MOQ Planner for Gazi Jute Enterprises. Assist wholesale buyers with converting order quantities across bales, rolls, pieces, bundles, bags, kg, quintals, and metric tons, verifying Minimum Order Quantities (MOQ), and organizing a clean itemized requirement list ready to send via the website WhatsApp quotation form.',
  },
  logistics_desk: {
    title: 'Trade & Dispatch Coordinator',
    prompt:
      'You are the Trade & Dispatch Coordinator for Gazi Jute Enterprises. Explain standard commercial wholesale booking workflows, INR trade invoicing guidelines, West Bengal sourcing belt dispatch norms, freight/moisture tolerances, and how to connect with our sales desk by phone, email, or WhatsApp.',
  },
};

function sanitizeString(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLen);
}

function buildSystemInstruction(
  roleId: ChatRoleId,
  publicContext?: PublicContextPayload
): string {
  const roleMeta = ROLE_INSTRUCTIONS[roleId] || ROLE_INSTRUCTIONS.product_advisor;
  const companyName = sanitizeString(publicContext?.companyName, 120) || 'Gazi Jute Enterprises';
  const currencyCode = sanitizeString(publicContext?.currencyCode, 10) || 'INR';
  const currencySymbol = sanitizeString(publicContext?.currencySymbol, 6) || '₹';
  const address = sanitizeString(publicContext?.address, 240);
  const email = sanitizeString(publicContext?.email, 120);
  const phones = Array.isArray(publicContext?.contactNumbers)
    ? publicContext.contactNumbers
        .map((n) => sanitizeString(n, 30))
        .filter(Boolean)
        .slice(0, 4)
    : [];

  const productLines = Array.isArray(publicContext?.products)
    ? publicContext.products.slice(0, 30).map((p) => {
        const name = sanitizeString(p.name, 100);
        const sku = sanitizeString(p.sku, 40);
        const cat = sanitizeString(p.categoryName, 60);
        const unit = sanitizeString(p.unit, 20);
        const moq = Number.isFinite(Number(p.minOrderQty)) ? Number(p.minOrderQty) : 1;
        const stockText = p.showStockPublicly
          ? `, Public Available Stock: ${Number(p.publicAvailableStock) || 0} ${unit}`
          : '';
        return `- ${name} (SKU: ${sku}, Category: ${cat}, Unit: ${unit}, MOQ: ${moq} ${unit}${stockText})`;
      })
    : [];

  return [
    roleMeta.prompt,
    '',
    `Active Company Context (${companyName}):`,
    `- Commercial Currency: ${currencyCode} (${currencySymbol})`,
    address ? `- Dispatch Office / Region: ${address}` : '',
    email ? `- Trade Desk Email: ${email}` : '',
    phones.length > 0 ? `- Trade Desk Telephone: ${phones.join(', ')}` : '',
    '',
    productLines.length > 0
      ? `Active Public Catalogue Summary:\n${productLines.join('\n')}`
      : 'No live public SKUs were passed in context; focus on general jute trade specifications and advise the buyer to browse /products or submit an enquiry on /contact.',
    '',
    'Strict Guardrails:',
    '1. NEVER invent or reveal private internal supplier names, purchase costs, cost-of-goods-sold, profit margins, or hidden stock quantities when public stock visibility is off.',
    '2. Wholesale prices are confirmed via formal quotation only; do not quote fabricated rupee prices.',
    '3. Keep responses concise, accurate, factual, and tailored to wholesale B2B jute buyers.',
    '4. When a buyer is ready to order or needs exact live rates, direct them to click "Request Quote" on a product or submit their quantities on the Contact Us / Wholesale Enquiry form for WhatsApp confirmation.',
  ]
    .filter(Boolean)
    .join('\n');
}

function getGenAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, model: MODEL_NAME });
  });

  app.post('/api/chat', async (req: Request, res: Response) => {
    const ai = getGenAiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'Gemini API key is not configured on the server. Set GEMINI_API_KEY in environment secrets.',
      });
      return;
    }

    const body = req.body as {
      message?: unknown;
      history?: unknown;
      roleId?: unknown;
      publicContext?: PublicContextPayload;
    };

    const userMessage = sanitizeString(body?.message, 2000);
    if (!userMessage) {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }

    const rawRoleId = typeof body?.roleId === 'string' ? body.roleId : 'product_advisor';
    const roleId: ChatRoleId =
      rawRoleId === 'bulk_quote_helper' || rawRoleId === 'logistics_desk'
        ? rawRoleId
        : 'product_advisor';

    const rawHistory = Array.isArray(body?.history) ? body.history : [];
    const formattedHistory: Content[] = rawHistory
      .slice(-24)
      .filter(
        (item): item is IncomingHistoryItem =>
          Boolean(item) &&
          typeof item === 'object' &&
          ((item as IncomingHistoryItem).role === 'user' ||
            (item as IncomingHistoryItem).role === 'model') &&
          typeof (item as IncomingHistoryItem).text === 'string' &&
          (item as IncomingHistoryItem).text.trim().length > 0
      )
      .map((item) => ({
        role: item.role,
        parts: [{ text: item.text.trim().slice(0, 4000) }],
      }));

    try {
      const systemInstruction = buildSystemInstruction(roleId, body?.publicContext);
      const chat = ai.chats.create({
        model: MODEL_NAME,
        config: {
          systemInstruction,
        },
        history: formattedHistory,
      });

      const response = await chat.sendMessage({ message: userMessage });
      const replyText = response.text?.trim();

      if (!replyText) {
        res.status(502).json({
          error: 'The assistant returned an empty response. Please try rephrasing your question.',
        });
        return;
      }

      res.json({
        reply: replyText,
        model: MODEL_NAME,
        roleId,
      });
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Unable to generate response from Gemini API.';
      console.error('[api/chat] Gemini request error:', errMsg);
      res.status(502).json({
        error: 'Assistant request failed. Please check Gemini API configuration and try again.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Production build not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gazi Jute Enterprises server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
