# Teacher Email Broadcasting Feature

## Overview

A new email broadcasting feature has been added to the teacher interface, allowing teachers to send email notifications to students on the platform.

## Features

### ✨ Main Functions
- **Custom Sender**: Teachers can use their own Gmail account as the sender
- **Fully Customizable Content**: Email subject and content are completely customizable
- **Flexible Recipient Selection**: Can select specific students or send to all students
- **Real Student Data**: Recipients come from real student registration emails in Firebase database
- **Secure Authentication**: Supports Gmail App Password authentication

### 🎯 Location
- "Send Email" button in the top-right corner of the teacher main page welcome banner

## Detailed Usage Instructions

### 1. Accessing the Feature
1. Log in to your teacher account
2. Navigate to the teacher main page (`/teacher`)
3. Click the "Send Email" button in the top-right corner

### 2. Configure Sender Information
**Sender Email Settings:**
- Enter your Gmail email address
- Enter your Gmail password or App Password
- **Important Note**: We recommend using Gmail App Password instead of your account password

**How to Create Gmail App Password:**
1. Log in to your Gmail account
2. Go to "Manage your Google Account"
3. Click on the "Security" tab
4. Ensure "2-Step Verification" is enabled
5. Under "Signing in to Google", click "App passwords"
6. Select "Mail" and "Windows Computer", then generate password
7. Use the generated 16-character password as your email sending password

### 3. Write Email Content
- **Email Subject**: Enter the email subject line
- **Email Content**: Enter the email body (supports line breaks)

### 4. Select Recipients
**Student Selection Options:**
- **Select All**: Click "Select All" button to send to all students
- **Select Specific Students**: Click individual student cards to select/deselect
- **No Selection**: Defaults to sending to all students if none are selected

**Student Information Display:**
- Shows student name and registration email
- Shows avatar
- Real-time display of selected student count

### 5. Send Email
1. Confirm all information is filled correctly
2. Click "Send Email" button
3. System will show sending progress
4. Success message and recipient count will be displayed after completion

## Email Template

Sent emails will use a professional template format:
- Email Subject: Teacher's custom subject
- Email Content: Teacher's custom content (supports HTML format)
- Footer Signature: Automatically adds "This email is sent from Open Impact Lab Learning Platform"

## Technical Features

### 🔧 Backend Technology
- **Email Service**: Using Nodemailer + Gmail SMTP
- **Data Source**: Firebase Firestore database
- **API Route**: `/api/send-email` (POST)
- **SMTP Configuration**: Enhanced Gmail SMTP settings with TLS support

### 🛡️ Security Features
- Validates required fields
- Supports Gmail App Password
- Enhanced error handling with user-friendly error messages
- Does not store user email passwords
- SMTP connection verification before sending

### 📱 User Experience
- Responsive design, mobile-friendly
- Real-time loading status display
- Toast notifications
- Form validation and error prompts
- English interface throughout

## Error Handling

### Common Errors and Solutions

1. **"Email login failed"**
   - Check if email address is correct
   - Verify password is correct
   - Recommend using App Password

2. **"Email authentication failed"**
   - Ensure Gmail "2-Step Verification" is enabled
   - Use App Password instead of account password
   - Check Gmail security settings

3. **"No valid recipient email addresses found"**
   - Confirm there is student data in the database
   - Check if students have valid email addresses

4. **"Cannot connect to email server"**
   - Check internet connection
   - Verify access to Gmail SMTP servers

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── send-email/
│   │       └── route.ts          # Email sending API with enhanced SMTP config
│   └── teacher/
│       └── page.tsx               # Teacher main page (with email button)
├── components/
│   └── teacher/
│       └── email-dialog.tsx       # Email sending dialog component (English UI)
└── app/
    └── layout.tsx                 # Added Toaster component
```

## Dependencies

New dependencies added:
```json
{
  "nodemailer": "^6.9.x",
  "@types/nodemailer": "^6.4.x"
}
```

## Usage Notes

1. **Gmail Setup Requirements**:
   - Must enable 2-Step Verification
   - Recommend using App Password
   - Ensure "Less secure app access" is disabled (for security)

2. **Sending Limits**:
   - Gmail daily sending limit: 500 emails
   - Recommend batch sending for large volumes

3. **Network Requirements**:
   - Stable internet connection required
   - Must be able to access Gmail SMTP servers (smtp.gmail.com:587)

4. **Privacy Protection**:
   - Passwords are not saved
   - Recommend clearing browser cache after use on public computers

## Supported Email Formats

- **HTML Format**: Supports rich text styling
- **Plain Text Format**: Automatically generates plain text version
- **Line Break Support**: Content line breaks display correctly
- **Unicode Support**: Full support for international characters

## Recent Improvements

### 🔧 Technical Enhancements
- **Enhanced SMTP Configuration**: 
  - Direct Gmail SMTP host configuration
  - Port 587 with STARTTLS encryption
  - TLS rejection handling for better compatibility
- **Connection Verification**: Pre-send SMTP connection testing
- **Improved Error Handling**: More detailed error messages and debugging info
- **Better Timeout Handling**: Enhanced network timeout management

### 🌐 Internationalization
- **Complete English Interface**: All UI text converted to English
- **Consistent Terminology**: Standardized technical terms throughout
- **User-Friendly Messages**: Clear, actionable error and success messages

## Troubleshooting

### If you're still getting 500 errors:

1. **Double-check Gmail Settings**:
   - Verify 2-Step Verification is enabled
   - Generate a new App Password specifically for this application
   - Use the App Password (16 characters) instead of your regular Gmail password

2. **Test Your Credentials**:
   - Try logging into Gmail with the same credentials
   - Ensure the Gmail account can send emails normally

3. **Network Issues**:
   - Check if your network/firewall allows SMTP connections
   - Verify port 587 is not blocked

4. **Check Browser Console**:
   - Open browser developer tools
   - Look for detailed error messages in the console
   - Check the Network tab for API response details

If problems persist, the enhanced error logging will now provide more specific information about the connection failure. 