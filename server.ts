import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API endpoint to send a non-expiring 6-digit password reset code via email
  app.post('/api/send-reset-code', async (req, res) => {
    try {
      const { email, code, displayName } = req.body || {};
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanCode = (code || '').trim();

      if (!cleanEmail || !cleanCode) {
        return res.status(400).json({ ok: false, error: 'Eksik e-posta veya doğrulama kodu.' });
      }

      const subject = `Haftalık Ekran Süresi - Şifre Sıfırlama Kodunuz: ${cleanCode}`;
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #f8fafc;">
          <h2 style="color: #1e293b; margin-top: 0; text-align: center;">Şifre Sıfırlama Doğrulama Kodunuz</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Merhaba ${displayName || 'Değerli Kullanıcımız'},<br/><br/>
            Hesabınızın şifresini yenilemek için aşağıdaki <strong>süresiz doğrulama kodunu</strong> uygulama içindeki şifre sıfırlama ekranına giriniz:
          </p>
          <div style="margin: 24px 0; padding: 18px; background-color: #eef2ff; border: 2px dashed #6366f1; border-radius: 12px; text-align: center;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #312e81;">
              ${cleanCode}
            </span>
          </div>
          <p style="color: #64748b; font-size: 12px; text-align: center; margin-bottom: 0;">
            Bu kodun kullanım süresi yoktur; istediğiniz zaman uygulamaya girerek yeni şifrenizi belirleyebilirsiniz.
          </p>
        </div>
      `;

      let sentViaProvider = false;

      // 1. Try FormSubmit AJAX endpoint (sends direct HTML email to inbox if activated or first-time)
      try {
        const fsResp = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(cleanEmail)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Origin: 'https://ais-pre-jo3qfqilx5x2p77h3rgriv-854792743663.europe-west2.run.app',
            Referer: 'https://ais-pre-jo3qfqilx5x2p77h3rgriv-854792743663.europe-west2.run.app/',
          },
          body: JSON.stringify({
            _subject: subject,
            _template: 'box',
            _captcha: 'false',
            Uygulama: 'Haftalık Ekran Süresi Takip Sistemi',
            Kullanici: displayName || cleanEmail,
            SIFRE_SIFIRLAMA_KODUNUZ: cleanCode,
            Bilgi: 'Bu kodun süresi yoktur. Uygulamadaki Şifre Sıfırlama ekranına bu 6 haneli kodu girerek yeni şifrenizi hemen belirleyebilirsiniz.',
          }),
        });
        if (fsResp.ok) {
          const fsData = (await fsResp.json().catch(() => ({}))) as any;
          if (fsData && (fsData.success === 'true' || fsData.success === true)) {
            sentViaProvider = true;
          }
        }
      } catch (e) {
        // Ignore and continue
      }

      return res.json({
        ok: true,
        sentViaProvider,
        subject,
        htmlBody,
      });
    } catch (error: any) {
      console.error('Error in /api/send-reset-code:', error);
      return res.status(500).json({ ok: false, error: error?.message || 'Sunucu hatası' });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
