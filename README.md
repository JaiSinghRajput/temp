# Dream Wedding Hub - E-Commerce Platform

A modern e-commerce platform for customizable wedding e-cards and e-videos built with Next.js 16, featuring real-time canvas editing, custom fonts, animations, and integrated payment processing.

## 🎯 Features

### E-Card Customization
- **Real-time Canvas Editor** powered by Fabric.js
- **Custom Text Elements** with full styling control (fonts, colors, sizes, weights)
- **Multi-page Templates** for complex card designs
- **Text Animations** - 11 animation types (fadeIn, slideIn variants, scaleIn, rotateIn, typewriter, bounce, pulse)
- **Custom Font Library** with Google Fonts CDN integration
- **Locked Template System** - Users edit text only, preserving designer intent
- **Live Preview** with responsive scaling
- **Share & Download** functionality

### E-Video Templates
- **Video Template Catalog** with categorized browsing
- **Pricing System** (Free & Premium)
- **Customization Requests** with WhatsApp integration
- **Category Management** (Wedding, Birthday, Anniversary, etc.)

### User Management
- **Authentication System** with JWT tokens
- **User Dashboard** to manage created cards
- **Session Persistence** with secure cookie storage
- **Admin Panel** for template and category management

### Search & Discovery
- **Unified Search** across e-cards and e-videos
- **Category Filtering** with dynamic subcategories
- **Responsive Grid Layouts** for optimal viewing

### Admin Features
- **Template Editor** with canvas-based design tools
- **Background Management** with Cloudinary integration
- **Font Management** for custom typography
- **Category & Subcategory** CRUD operations
- **Multi-page Template Support**

## 🛠️ Tech Stack

### Frontend
- **Next.js 16.1.1** with App Router & Turbopack
- **React 19** with Server Components
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Fabric.js 7.0** for canvas manipulation
- **Framer Motion** for UI animations
- **Material-UI** for component library
- **Lucide React** for icons

### Backend
- **Next.js API Routes** for serverless functions
- **MySQL 2** with connection pooling
- **JWT** for authentication
- **bcryptjs** for password hashing

### Media & Payments
- **Cloudinary** for image storage and CDN
- **Razorpay** for payment processing

### Development
- **ESLint** for code linting
- **pnpm** for package management

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- MySQL database

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd temp
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=dream_wedding_hub
   
   # JWT Secret
   JWT_SECRET=your_jwt_secret_key
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   # Razorpay
   RAZORPAY_KEY_ID=your_razorpay_key
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   ```

4. **Set up the database**
   
   Import the schema from `database/schema.sql`:
   ```bash
   mysql -u your_db_user -p dream_wedding_hub < database/schema.sql
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
├── app/                      # Next.js App Router pages
│   ├── api/                  # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── categories/      # Category management
│   │   ├── e-video/         # Video template APIs
│   │   ├── payments/        # Payment processing
│   │   └── templates/       # E-card template APIs
│   ├── admin/               # Admin panel pages
│   ├── e-card/              # E-card browsing & customization
│   ├── e-videos/            # Video template browsing
│   ├── login/               # User authentication
│   └── register/            # User registration
├── components/              # React components
│   ├── admin/              # Admin-specific components
│   ├── canvas/             # Canvas editing components
│   ├── layout/             # Layout components (Navbar, Footer)
│   └── ui/                 # Reusable UI components
├── lib/                     # Utility libraries
│   ├── canvas-renderer.ts  # Canvas loading & rendering
│   ├── canvas-text-animations.ts  # Text animation engine
│   ├── db.ts               # Database connection pool
│   ├── auth.ts             # Authentication utilities
│   └── cloudinary.ts       # Cloudinary integration
├── hooks/                   # Custom React hooks
├── services/               # API service layer
├── contexts/               # React Context providers
├── database/               # Database schema & migrations
└── public/                 # Static assets
    ├── robots.txt          # SEO crawler directives
    └── sitemap.xml         # XML sitemap
```

## 🎨 Key Features Explained

### Canvas Animation System
The platform features a custom animation engine built on Fabric.js with 11 animation types:
- **fadeIn** - Gradual opacity transition
- **slideInLeft/Right/Top/Bottom** - Directional slide animations
- **scaleIn** - Zoom-in effect from center
- **rotateIn** - Rotation with fade
- **typewriter** - Character-by-character reveal
- **bounce** - Spring-loaded entrance
- **pulse** - Attention-grabbing scale pulse

Animations trigger automatically on:
- Canvas load (customize view)
- Card share/view (public view)
- Text element creation (admin editor)

### Text-Only Editing System
Users can customize pre-designed templates by:
1. Selecting a template from the catalog
2. Editing text content only (no repositioning/resizing)
3. Changing text styles (font, color, size, weight)
4. Previewing changes in real-time
5. Sharing or downloading the final card

This ensures consistent, professional designs while allowing personalization.

### Multi-Page Templates
Templates support multiple pages (for cards with inside/outside designs):
- Page navigation in editor
- Independent backgrounds per page
- Separate text elements for each page
- Synchronized saving across all pages

## 🚀 Deployment

### Build for Production
```bash
pnpm build
pnpm start
```

### Environment Variables
Ensure all production environment variables are set before deployment.

### SEO Configuration
- `robots.txt` configured to allow crawling of public pages
- `sitemap.xml` includes all main pages and categories
- Meta tags optimized for social sharing

## 📝 Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## 🔐 Authentication Flow

1. User registers with email/password
2. Password hashed with bcryptjs
3. JWT token generated on login
4. Token stored in httpOnly cookie
5. Protected routes verify token server-side
6. Token auto-refresh on valid requests

## 💳 Payment Integration

- **Razorpay** for secure payment processing
- Payment verification with signature validation
- Order tracking in database
- Success/failure callbacks
- Webhook support for payment updates

## 🌐 API Documentation

### Public Endpoints
- `GET /api/categories` - List all categories
- `GET /api/templates` - Get e-card templates
- `GET /api/e-video/templates` - Get video templates
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Protected Endpoints (Require Auth)
- `GET /api/user-ecards` - Get user's created cards
- `POST /api/templates/:id/customize` - Save customized card
- `POST /api/payments/razorpay/order` - Create payment order

### Admin Endpoints (Admin Only)
- `POST /api/templates` - Create new template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `POST /api/categories` - Create category
- `POST /api/fonts` - Add custom font

## 🤝 Contributing

This is a private commercial project. For inquiries, please contact the project owner.

## 📄 License

Proprietary - All rights reserved

## 🔗 Links

- **Production**: [https://shop.dreamweddinghub.com](https://shop.dreamweddinghub.com)
- **Admin Panel**: [https://shop.dreamweddinghub.com/admin](https://shop.dreamweddinghub.com/admin)

---

Built with ❤️ for Dream Wedding Hub
