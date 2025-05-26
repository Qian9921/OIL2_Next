# Project Status Automation

This document outlines how to set up automatic project status updates for the OIL2_Next platform.

## Overview

The platform includes a feature to automatically update project statuses based on the following rules:

1. **Deadline Reached**: Projects with passed deadlines are automatically marked as "completed"
2. **Auto-Archive**: Completed projects are automatically archived after 30 days
3. **Status Transitions**: 
   - Published projects cannot go back to draft status
   - Completed projects can only be archived (not moved back to published or draft)
   - Archived projects cannot change status

## Configuring the Cron Job

To ensure these automatic updates occur, you'll need to set up a cron job to periodically call the update API endpoint.

### 1. Set Environment Variables

In your `.env.local` file, add a secure API key:

```
CRON_API_KEY=your-secure-random-string
```

Make sure to use a strong, randomly generated string for security. This key is now included in the `.env.local` file that is checked into the repository.

### 2. Setup with Vercel Cron

If you're deploying with Vercel, you can use Vercel Cron Jobs:

1. Create a `vercel.json` file in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-project-statuses?apiKey=your-secure-random-string",
      "schedule": "0 0 * * *"
    }
  ]
}
```

This will run the job daily at midnight.

### 3. Alternative: External Cron Service

You can also use an external service like:

- [Cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [GitHub Actions](https://github.com/features/actions)

Configure the service to make a GET request to:

```
https://your-domain.com/api/cron/update-project-statuses?apiKey=your-secure-random-string
```

Recommended schedule: At least once daily.

## Environment Variables Reference

All environment variables are now included in the `.env.local` file in the repository. However, you should still update the values to match your specific configuration:

```
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# NextAuth Configuration
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Google Cloud for Vertex AI
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# Cron Job API Key
CRON_API_KEY=your-secure-random-string
```

## Monitoring

The cron endpoint returns detailed information about the updates made. You may want to implement additional logging or monitoring to track these status changes.

## Testing

You can test the endpoint manually by visiting:

```
https://your-domain.com/api/cron/update-project-statuses?apiKey=your-secure-random-string
```

The response will include information about any projects that were updated.

## Troubleshooting

If you encounter issues:

1. Check server logs for errors
2. Verify your API key is correctly set in both the environment variables and the cron job URL
3. Ensure the cron job is running at the expected times
4. Look for any Firebase/Firestore permissions issues that might prevent updates 