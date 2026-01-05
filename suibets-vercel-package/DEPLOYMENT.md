# SuiBets Platform Deployment Guide for Vercel

This is an optimized deployment package for the SuiBets sports betting platform that's ready for deployment on Vercel.

## Package Contents

This package includes:

- Frontend React application (client directory)
- Backend Express server (server directory)
- Shared types and database schema (shared directory)
- Configuration files (package.json, tsconfig.json, etc.)
- Vercel deployment configuration (vercel.json)

## Important Notes

### Environment Variables

Before deploying, make sure to set up the following environment variables in your Vercel project settings:

```
DATABASE_URL=your_database_connection_string
API_SPORTS_KEY=your_api_sports_key
WALRUS_API_KEY=your_walrus_api_key
```

### Database Setup

This application requires a PostgreSQL database. When deploying on Vercel:

1. Create a PostgreSQL database instance through Vercel or use an external provider
2. Set the DATABASE_URL environment variable in your Vercel project settings
3. Run the database initialization scripts before the first deployment

### Wallet Integration

The application is configured to work with Walrus and Sui blockchain. Make sure to:

1. Configure your blockchain network settings in the environment variables
2. Set up your wallet API keys and credentials as environment variables

## Deployment Steps

1. Extract the package: `tar -xzf suibets-vercel-package.tar.gz`
2. Navigate to the package directory: `cd suibets-vercel-package`
3. Initialize Git repository (if needed): `git init`
4. Install dependencies: `npm install`
5. Deploy to Vercel: `vercel` or connect your GitHub repository to Vercel for automatic deployments

## Technical Architecture

- Frontend: React with Tailwind CSS, shadcn/UI components
- Backend: Express with TypeScript
- Database: PostgreSQL with Drizzle ORM
- Blockchain: Sui network with Walrus integration

The deployment package is optimized to be under 4MB and includes all the necessary code to run the application on Vercel.