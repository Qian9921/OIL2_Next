# Certificate Integration with External API

## Overview
This document describes the integration of an external certificate generation API into the NGO certificate management system.

## Changes Made

### 1. User Profile Enhancement
**File**: `src/lib/types.ts`
- Added `signature?: string` field to the User profile interface
- This allows NGOs to store their signature for certificate generation

**File**: `src/app/ngo/profile/page.tsx`
- Added signature input field in the NGO profile editing form
- Added validation and save functionality for the signature field
- Added UI section for "Certificate Signature" with description

### 2. Certificate Page Redesign
**File**: `src/app/ngo/certificates/page.tsx`
- Completely redesigned the certificate management page
- Replaced the old certificate issuance system with direct API integration
- Added signature validation before certificate generation
- Implemented direct PDF download functionality

## API Integration Details

### External API Endpoint
```
https://auto-cert-py-827682634474.us-central1.run.app/generate-certificate
```

### API Request Format
```json
{
  "studentName": "Student Full Name",
  "ngoSignature": "NGO Signature from Profile",
  "ngoName": "NGO Organization Name",
  "contents": "Project Title",
  "date": "2025-01-23"
}
```

### API Response
- Returns a PDF blob that is automatically downloaded
- File naming format: `certificate_{studentName}_{projectTitle}.pdf`

## Key Features

### 1. Signature Management
- NGOs must set their signature in their profile before generating certificates
- Warning message displayed if signature is not set
- Direct link to profile page for signature setup

### 2. Certificate Generation
- One-click certificate generation for completed projects
- Automatic PDF download with descriptive filename
- Loading states and error handling
- Success/failure toast notifications

### 3. Data Mapping
- **Student Name**: From student profile
- **NGO Signature**: From NGO profile (newly added field)
- **NGO Name**: From NGO profile name
- **Contents**: Project title
- **Date**: Project completion date (formatted as YYYY-MM-DD)

### 4. User Experience
- All text is in English
- Clear status indicators (Ready for Certificate, Certificate Available)
- Responsive design with proper loading states
- Error handling with user-friendly messages

## Technical Implementation

### State Management
- `ngoSignature`: Stores the NGO's signature from profile
- `generatingCertificate`: Tracks which certificate is being generated
- `completedProjects`: List of projects ready for certificate generation

### Error Handling
- Network errors during API calls
- Missing signature validation
- File download failures
- User-friendly error messages via toast notifications

### Security Considerations
- API calls are made from the client side
- No sensitive data is stored locally
- PDF files are generated server-side and streamed to client

## Usage Flow

1. **Setup**: NGO sets their signature in profile settings
2. **View**: NGO navigates to certificate management page
3. **Generate**: NGO clicks "Generate Certificate" for completed projects
4. **Download**: PDF certificate is automatically downloaded
5. **Repeat**: Process can be repeated for multiple students/projects

## Benefits

- **Automated**: No manual certificate creation needed
- **Consistent**: All certificates follow the same format
- **Efficient**: Direct API integration with immediate download
- **User-friendly**: Simple one-click process
- **Scalable**: Can handle multiple certificate generations

## Future Enhancements

- Batch certificate generation for multiple students
- Certificate template customization
- Certificate history tracking
- Email delivery of certificates
- Certificate verification system 