# Invoice Manager — Next.js Migration

Professional, multi-user invoice management system with Gmail OAuth, MongoDB, and on-the-fly PDF generation.

## 🚀 Setup Instructions

### 1. Environment Variables
Create a `.env.local` file in the root directory with the following:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=invoice_db
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 2. Google OAuth Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Configure **OAuth Consent Screen**.
4. Create **OAuth 2.0 Client IDs**.
5. Add Authorized Redirect URIs: `http://localhost:3000/api/auth/callback/google`

### 3. Installation
```bash
pnpm install
```

### 4. Running Locally
```bash
pnpm dev
```

## 🛠 Features

- **Gmail OAuth**: Secure login for multiple users.
- **Data Isolation**: Users only see and manage their own invoices.
- **UUID Identification**: Every invoice has a unique, secure UUID and a user-friendly invoice number.
- **On-the-fly PDF**: Invoices are generated as PDFs using `pdf-lib` (no external storage).
- **Public Lookup**: Customers can retrieve PDFs by entering the Invoice Number and Date.
- **Premium UI**: Replicated original glass-morphism design with vanilla CSS.

## 📁 Project Structure

- `app/api/auth/`: NextAuth configuration.
- `app/api/invoices/`: CRUD and Public PDF endpoints.
- `app/create/`: Invoice creation/editing form.
- `app/view/`: Records dashboard with filters and stats.
- `lib/pdfGenerator.ts`: Server-side PDF logic.
- `lib/models/Invoice.ts`: Type definitions for MongoDB documents.
