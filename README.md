# Production Copilot 🎬

An AI-Powered Production Management System designed specifically for the Indian film industry. This comprehensive platform centralizes all aspects of film production with predictive AI, risk detection, and intelligent decision-making capabilities.

![Production Copilot](https://img.shields.io/badge/Built%20with-Lovable-ff69b4)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-3.x-38bdf8)

## 🌟 Features

### Core Capabilities
- **AI-Powered Risk Detection** - Real-time monitoring with predictive analytics to identify budget overruns, schedule delays, and crew issues before they escalate
- **What-If Simulations** - Test different scenarios and see projected impacts on budget, schedule, and resources
- **Smart Alerts & Insights** - Intelligent notifications with confidence scores and actionable recommendations
- **Natural Language Queries** - Ask questions in plain language about production status, budget, schedule, and team performance
- **Production Health Score** - Comprehensive health metrics tracking budget compliance, schedule adherence, crew efficiency, and quality scores

### Production Modules

#### 📋 Pre-Production
- Script development tracking
- Casting database with photo management
- Location scouting with images/maps
- Shot list management
- Storyboarding tools

#### 🎬 Production
- Daily shoot schedule management
- Scene breakdown with script uploads
- Dailies review system with video upload
- Equipment tracking interface
- Call sheet generation

#### 🎞️ Post-Production
- Editing timeline tracker
- VFX shot management
- Audio post workflow
- Color grading status
- Deliverables tracking

#### 📦 Distribution
- Theater booking interface
- Marketing campaign tracker
- Release schedule calendar
- Revenue tracking and analytics

#### 💰 Budget & Finance
- Budget allocation interface
- Real-time expense tracking with receipt uploads
- Vendor payment management
- Budget vs. actual comparison charts
- Financial forecasting

#### 📅 Schedule
- Interactive calendar view
- Crew availability management
- Milestone tracking
- Resource allocation
- Timeline visualization

#### 👥 Team & HR
- Crew member database
- Department management
- Attendance tracking
- Payroll records
- Performance metrics

### Design Features
- **Dark/Light Mode Toggle** - Seamless theme switching
- **Customizable Accent Colors** - Choose from presets or create custom colors using HSL values
- **Responsive Design** - Optimized for all screen sizes
- **Cinematic UI** - Dark theme with purple, teal, and crimson accents
- **Collapsible Sidebar** - Clean navigation with active route highlighting

## 🛠️ Technology Stack

- **Framework**: React 18.3.1
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Shadcn UI (40+ components)
- **Icons**: Lucide React
- **Charts**: Recharts
- **Routing**: React Router DOM 6.30.1
- **State Management**: React Query (TanStack Query)
- **Form Handling**: React Hook Form + Zod validation
- **Notifications**: Sonner

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Setup

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd production-copilot

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:8080`

## 🚀 Development

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Shadcn UI components
│   ├── AIChatBox.tsx   # AI assistant interface
│   ├── BudgetChart.tsx # Financial visualizations
│   ├── ProductionSidebar.tsx
│   ├── SettingsDialog.tsx
│   └── ...
├── contexts/           # React contexts
│   └── ThemeContext.tsx
├── pages/              # Route pages
│   ├── Index.tsx       # Main dashboard
│   ├── Landing.tsx     # Landing page
│   ├── Auth.tsx        # Authentication
│   ├── Production.tsx
│   ├── Finance.tsx
│   └── ...
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── App.tsx             # Main app component
├── main.tsx           # Entry point
└── index.css          # Global styles & design tokens
```

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## 🎨 Customization

### Theme Customization

The application supports full theme customization through the Settings panel (accessible from the sidebar after login):

**Dark/Light Mode**: Toggle available in the header on all pages

**Accent Color Customization**:
- 6 preset colors (Purple, Blue, Green, Orange, Pink, Teal)
- Custom HSL color picker with real-time preview
- Adjustable Hue (0-360°), Saturation (0-100%), Lightness (30-80%)

### Design System

All colors and styles are defined using semantic tokens in `src/index.css`:

```css
:root {
  --primary: 280 65% 60%;
  --secondary: 175 70% 50%;
  --accent: 345 85% 55%;
  --gradient-primary: linear-gradient(...);
  /* ... more tokens */
}
```

Customize by editing these CSS variables to match your brand.

## 🔐 Authentication

Currently uses hardcoded credentials for demo purposes:
- **Email**: admin@filmflow.com
- **Password**: admin123

All routes except landing and login are protected and require authentication.

## 📊 Current Limitations

**Note**: This is currently a fully functional **front-end prototype**. All data is hardcoded as static mock data:

- ❌ No backend database integration
- ❌ No data persistence
- ❌ No user input/CRUD operations
- ❌ No file upload functionality
- ❌ No real AI integration
- ❌ No multi-user support

## 🚧 Roadmap

### Phase 1: Backend Setup
- [ ] Integrate Lovable Cloud/Supabase
- [ ] Set up authentication (email, phone, Google)
- [ ] Create database schema for all modules
- [ ] Configure Row Level Security
- [ ] Set up file storage buckets

### Phase 2: Core Features
- [ ] Implement CRUD operations for all modules
- [ ] Add file upload for documents, images, videos
- [ ] Create forms for data entry across all modules
- [ ] Real-time collaboration features
- [ ] Multi-project support

### Phase 3: Advanced AI Features
- [ ] AI risk detection engine (Edge Functions)
- [ ] What-if simulation system
- [ ] Natural language chat interface with real AI
- [ ] Automated reporting and PDF exports
- [ ] Predictive analytics

### Phase 4: Integration & Polish
- [ ] Data import/export (Excel, CSV)
- [ ] Accounting software integration
- [ ] WhatsApp/SMS notifications
- [ ] Multi-language support (Telugu, Hindi, Tamil)
- [ ] Mobile apps (iOS, Android)

## 📄 License

This project is built using Lovable and follows standard web development practices.

## 🔗 Links

- **Lovable Project**: https://lovable.dev/projects/41913b5d-d27b-412a-b067-cb5a2a07008d
- **Documentation**: [Lovable Docs](https://docs.lovable.dev)

## 🤝 Contributing

This is a Lovable-powered project. Changes can be made through:
1. The Lovable web interface (recommended)
2. Direct code edits in your IDE (syncs automatically)
3. GitHub web interface
4. GitHub Codespaces

## 📞 Support

For issues or questions:
- Open an issue in this repository
- Visit [Lovable Documentation](https://docs.lovable.dev)
- Join the [Lovable Discord Community](https://discord.com/channels/1119885301872070706/1280461670979993613)

---

**Built with ❤️ using [Lovable](https://lovable.dev)** - The AI-powered app builder
