#!/bin/bash
# Generate self-signed SSL certificate for local development

echo "🔐 Generating self-signed SSL certificate..."

openssl req -x509 -newkey rsa:4096 -nodes \
  -out cert.pem \
  -keyout key.pem \
  -days 365 \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

echo "✅ Certificate generated!"
echo "📁 Files created: cert.pem and key.pem"
echo ""
echo "⚠️  You'll need to accept the security warning in Safari"