-- Add qr_token column to clients table for QR code debt page links
ALTER TABLE clients ADD COLUMN IF NOT EXISTS qr_token TEXT;

-- Generate unique tokens for existing clients that don't have one
UPDATE clients
SET qr_token = substr(md5(random()::text || clock_timestamp()::text), 1, 20)
WHERE qr_token IS NULL OR qr_token = '';

-- Create index for fast lookups by token (used by /api/debt/[token])
CREATE INDEX IF NOT EXISTS idx_clients_qr_token ON clients (qr_token);
