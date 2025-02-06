# CrowdStrike Service Access Analyzer

A web-based visualization tool for analyzing CrowdStrike "On-Prem Service Access" data. This application allows you to upload CSV exports from CrowdStrike to explore access patterns, track frequencies, and map relationships over time. All data processing occurs client-side in your browser for privacy and security.

## Features

- Interactive data visualization dashboard
- Advanced filtering and search capabilities
- Date range filtering
- Responsive design
- Client-side data persistence
- Virtual scrolling for large datasets
- Real-time data analysis
- CSV export functionality

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/o-th/crowdstrike-service-analyzer.git
cd crowdstrike-service-analyzer
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

## Data Source Instructions

1. Go to [CrowdStrike Identity Protection](https://falcon.crowdstrike.com/identity-protection/)
2. Navigate to Threat Hunter -> Identity Protection -> Activity
3. Filter for "On-Prem Service Access" events
4. Click Export and select CSV format
5. Upload the exported CSV file to the analyzer

## Required CSV Headers

The uploaded CSV file must contain the following headers:
- Source
- Source Name
- IP
- Service
- Target
- Timestamp

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- IndexedDB
- Papa Parse
- React Virtual
- Radix UI Components

## Development

The application is built with modern web technologies and follows a component-based architecture. Key features include:

- Client-side data processing and analysis
- Persistent storage using IndexedDB
- Virtual scrolling for handling large datasets
- Real-time filtering and sorting
- Interactive data visualizations
- Responsive UI components

## License

MIT
