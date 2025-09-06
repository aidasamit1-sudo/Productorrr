# PixelForge - AI Product Photography Platform

[![Deploy Status](https://github.com/yourusername/pixelforge/workflows/Deploy%20PixelForge/badge.svg)](https://github.com/yourusername/pixelforge/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 AI-Powered Product Photography Platform

Transform your basic product photos into professional marketing assets with AI. Generate stunning product photography without expensive equipment or studios.

### ✨ Features

- 🤖 **AI Image Generation** - Google Imagen API integration
- 💳 **Payment Processing** - Stripe integration with webhooks
- 🔐 **User Authentication** - Google OAuth
- 📁 **File Storage** - Cloudflare R2 with CDN
- 🗄️ **Database** - Cloudflare D1 with migrations
- 🛡️ **Security** - Rate limiting, input validation, HTTPS
- 📊 **Monitoring** - Health checks, error tracking
- ⚡ **Performance** - Global edge deployment

### 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Cloudflare Workers + Hono framework
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (S3-compatible)
- **AI**: Google Imagen API
- **Payments**: Stripe
- **Auth**: Mocha Users Service

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 8+
- Cloudflare account
- Google Cloud Platform account
- Stripe account

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/pixelforge.git
cd pixelforge

# Install dependencies
npm install

# Install Wrangler CLI
npm install -g wrangler@latest

# Setup Cloudflare resources
npm run setup:cloudflare

# Configure secrets
npm run setup:secrets

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
