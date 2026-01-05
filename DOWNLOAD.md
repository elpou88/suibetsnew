# SuiBets Platform Download Instructions

The complete SuiBets platform has been packaged for you in this Replit environment. To download it:

## Option 1: Direct Download from Replit

1. Look for the `Files` panel on the left side of this Replit interface
2. Find the file named `suibets-platform.tar.gz`
3. Right-click on this file and select "Download"
4. Once downloaded to your local machine, extract the .tar.gz file:
   ```
   tar -xzvf suibets-platform.tar.gz
   ```

## Option 2: Terminal Download

If you're familiar with command line tools, you can download directly using:

```bash
curl -L -o suibets-platform.tar.gz "https://replit.com/@your-replit-username/your-repl-name/suibets-platform.tar.gz"
```

## Package Contents

The downloaded package includes:

1. Complete client application with all UI components
2. Server code for connecting to sports APIs
3. Move smart contracts for the Sui blockchain
4. Deployment configurations
5. Important configuration files:
   - `.env.example` - Environment variables template
   - `walrus.json` - Walrus deployment configuration
   - `DEPLOYMENT.md` - Detailed deployment instructions

## After Downloading

1. Extract the archive
2. Follow the instructions in DEPLOYMENT.md
3. Ensure you've set up your API keys in .env
4. Install dependencies with `npm install`
5. Start the application with `npm run dev`

For any issues during deployment, refer to our Telegram support channel: https://t.me/Sui_Bets