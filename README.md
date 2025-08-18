# Cerberus Incident Response Frontend

A modern, responsive web application for managing cybersecurity incidents and incident response operations. Built with React, Vite, and Tailwind CSS.

## Features

- **Dashboard Overview**: Real-time incident statistics and system status
- **Incident Management**: Track and manage security incidents with severity levels
- **Modern UI**: Clean, professional interface designed for security operations
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark Theme**: Optimized for low-light environments and extended use

## Tech Stack

- **React 19** - Modern React with latest features
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS processing
- **ESLint** - Code linting and formatting

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cerberus-ir-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
cerberus-ir-frontend/
├── public/                 # Static assets
├── src/
│   ├── assets/            # Images and other assets
│   ├── App.jsx            # Main application component
│   ├── index.css          # Global styles with Tailwind
│   └── main.jsx           # Application entry point
├── index.html             # HTML template
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind CSS configuration
├── postcss.config.js      # PostCSS configuration
├── vite.config.js         # Vite configuration
└── README.md              # Project documentation
```

## Features Overview

### Dashboard
- Incident statistics cards
- Recent incidents table
- Quick action buttons
- System status indicators

### Incident Management
- Incident severity levels (Critical, High, Medium, Low)
- Status tracking (Active, Investigating, Contained, Resolved)
- Real-time updates and notifications

### UI Components
- Responsive card layouts
- Interactive tables with hover effects
- Status badges with color coding
- Modern button styles with hover states

## Customization

### Styling
The application uses Tailwind CSS for styling. You can customize the design by:

1. Modifying `tailwind.config.js` for theme customization
2. Adding custom CSS classes in `src/index.css`
3. Using Tailwind's utility classes directly in components

### Adding New Features
- Create new components in the `src/components/` directory
- Add new routes and pages as needed
- Extend the incident management functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact the development team or create an issue in the repository.
