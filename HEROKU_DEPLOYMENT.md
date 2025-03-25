# Heroku Deployment Guide for CodeInsight

This guide explains how to deploy the CodeInsight application to Heroku.

## Prerequisites

- A [Heroku account](https://signup.heroku.com/)
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
- Git installed and configured
- MongoDB Atlas account (for the database)
- GitHub OAuth Application (for authentication)
- OpenAI API key (for AI features)

## Important Configuration Notes

### TypeScript Configuration
TypeScript has been added as a dependency in both the root package.json and server/package.json files. This ensures that TypeScript is available during the build process in Heroku, which doesn't install devDependencies in production by default.

### Node.js Engine Configuration
The package.json file specifies Node.js 18.x as the required engine. This is important because Heroku requires a specific Node.js version range rather than an open-ended range (like >=18.x).

### Build Process and Package Management
The application uses Heroku's specific build hooks to ensure proper dependency installation and building:

1. A `heroku-postbuild` script in package.json handles:
   - Reinstalling dependencies with `npm install` (not `npm ci`)
   - Installing server dependencies
   - Running the build process for both server and client

2. A simplified Procfile only starts the application:
   ```
   web: npm start
   ```

**Important**: The `heroku-postbuild` script is crucial because it runs after Heroku's initial dependency installation attempt. It uses `npm install` instead of `npm ci`, which allows installation to proceed without strict package-lock.json validation. This solves the "Missing: typescript@5.8.2 from lock file" error by bypassing the package-lock.json mismatch check.

## Deployment Steps

### 1. Create a Heroku App

```bash
# Login to Heroku
heroku login

# Create a new Heroku app
heroku create your-app-name

# Or if you already have an app
heroku git:remote -a your-app-name
```

### 2. Configure Environment Variables

Set up all required environment variables in Heroku:

```bash
# Database configuration
heroku config:set MONGO_URI=mongodb+srv://your-mongodb-atlas-connection-string

# JWT configuration
heroku config:set JWT_SECRET=your-strong-secret-key

# GitHub OAuth configuration
heroku config:set GITHUB_CLIENT_ID=your-github-client-id
heroku config:set GITHUB_CLIENT_SECRET=your-github-client-secret

# OpenAI configuration
heroku config:set OPENAI_API_KEY=your-openai-api-key

# Client URL (your Heroku app URL)
heroku config:set CLIENT_URL=https://your-app-name.herokuapp.com

# Set Node environment to production
heroku config:set NODE_ENV=production
```

### 3. Push to Heroku

The repository is already configured with a Procfile and the necessary Node.js engine specification in package.json.

```bash
# Push your code to Heroku
git push heroku main
```

### 4. Verify Deployment

```bash
# Open the deployed app in your browser
heroku open
```

## Important Notes

### MongoDB Setup

- Create a MongoDB Atlas cluster
- Configure network access to allow connections from anywhere (or just Heroku IPs)
- Create a database user with read/write permissions
- Use the connection string in the MONGO_URI environment variable

### GitHub OAuth Setup

1. Go to GitHub Developer Settings > OAuth Apps > New OAuth App
2. Set the homepage URL to your Heroku app URL
3. Set the Authorization callback URL to `https://your-app-name.herokuapp.com/api/auth/github/callback`
4. Once created, note down the Client ID and generate a Client Secret

### Heroku Add-ons (Optional)

You might want to consider adding the following Heroku add-ons:

- Heroku Scheduler: For running periodic tasks
- Papertrail: For better log management
- Redis: If your app uses caching (note: Redis is mentioned in dependencies)

### Troubleshooting

- Check logs: `heroku logs --tail`
- Restart the app: `heroku restart`
- SSH into the app: `heroku run bash`

## Scaling (Optional)

Once your app is deployed and running properly, you might want to scale it:

```bash
# Scale to more than one web dyno
heroku ps:scale web=2