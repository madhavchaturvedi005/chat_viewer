# Chat Viewer

A React application to view WhatsApp and Instagram chat exports with a beautiful UI.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Usage

- Upload WhatsApp chat exports (.txt files)
- Upload Instagram chat exports (.html files)
- Switch between platforms using the sidebar icons
- Search through messages
- View conversations in a familiar chat interface

## Features

- WhatsApp-style UI for WhatsApp chats
- Instagram-style UI for Instagram chats
- Advanced message search with navigation:
  - Search through all messages in the current chat
  - Navigate between matches using up/down arrow buttons
  - Current match highlighted in orange, other matches in yellow
  - Shows match counter (e.g., "2/5")
  - Auto-scrolls to the current match
- Multiple chat support
- Date grouping
- Responsive design with Tailwind CSS
