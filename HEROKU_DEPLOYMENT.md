# Heroku Deployment Guide for CodeInsight

This guide explains how to deploy the CodeInsight application to Heroku.

## Prerequisites

- A [Heroku account](https://signup.heroku.com/)
- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
- Git installed and configured
- MongoDB Atlas account (for the database)
- GitHub OAuth Application (for authentication)
- OpenAI API key (for AI features)
- Python installed (for repository analysis features)

## Important Configuration Notes

### TypeScript Configuration
TypeScript has been added as a dependency in both the root package.json and server/package.json files. This ensures that TypeScript is available during the build process in Heroku, which doesn't install devDependencies in production by default.

### Node.js Engine Configuration
The package.json file specifies Node.js 18.x as the required engine. This is important because Heroku requires a specific Node.js version range rather than an open-ended range (like >=18.x).

### Python Requirement - CRITICAL
The application uses a Python script (repository-ingest.py) with the gitingest package for repository analysis. You must add the Python buildpack to your Heroku application to ensure this functionality works correctly.

If you don't add the Python buildpack, you will encounter the following error:
```
Error: spawn python ENOENT
```

### Build Process and Package Management
The application uses multiple strategies to ensure proper deployment on Heroku:

1. A `.npmrc` configuration file containing:
   ```
   package-lock=false
   ```
   This critical setting tells npm to ignore the package-lock.json file during installation, allowing the build to proceed even when package.json and package-lock.json have discrepancies.

2. A `heroku-postbuild` script in package.json handles:
   - Reinstalling dependencies with `npm install` (not `npm ci`)
   - Installing server dependencies
   - Running the build process for both server and client

3. A simplified Procfile only starts the application:
   ```
   web: npm start
   ```

**Important**: The combination of .npmrc configuration and heroku-postbuild script ensures that the installation completes successfully even though there's a mismatch between package.json (which has TypeScript added) and package-lock.json. This directly addresses the "Missing: typescript@5.8.2 from lock file" error that would otherwise cause the build to fail.

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

### 2. Add Required Buildpacks

The application requires both Node.js and Python. Add both buildpacks to your Heroku app:

```bash
# Add Node.js buildpack (default)
heroku buildpacks:add heroku/nodejs

# Add Python buildpack
heroku buildpacks:add heroku/python

# Add Apt buildpack for system dependencies (Git)
heroku buildpacks:add --index 1 heroku-community/apt

# Verify the buildpacks
heroku buildpacks
```

The output should show all buildpacks in the correct order:

```
=== your-app-name Buildpack URLs
1. heroku-community/apt
2. heroku/nodejs
3. heroku/python
```

If you need to set the order specifically:

```bash
heroku buildpacks:clear
heroku buildpacks:add heroku-community/apt
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add heroku/python
```

### 3. System Dependencies and Python Requirements

#### a. Aptfile for System Dependencies

An `Aptfile` in the root of your project specifies system-level dependencies required by the application. The app needs Git for repository analysis:

```
git
```

This file works with the Apt buildpack to install Git on the Heroku dyno.

#### b. Python Dependencies

The `requirements.txt` file in the root of your project specifies Python packages:

```
gitingest>=0.1.0
```

This tells Heroku to install the gitingest Python package needed by repository-ingest.py, which requires Git to be installed on the system.

### 4. Configure Environment Variables

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