# Weekly Planner

A modern weekly planner application built with React 19, TypeScript 5.8, Tailwind CSS, and Firebase Firestore. Organize your tasks for the week with smooth drag-and-drop functionality to update progress.

## Features

- 📅 **Weekly Calendar View**: Visual representation of your week with tasks organized by day
- 🎯 **Task Management**: Add, edit, and delete tasks with title, description, priority, and status
- 🚀 **Modern Drag & Drop**: Smooth progress updates using @dnd-kit (React 19 compatible)
- 🔥 **Firebase Integration**: Real-time data persistence with Firestore
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🎨 **Modern UI**: Beautiful interface built with Tailwind CSS
- ⚡ **Fast Development**: Built with Vite for lightning-fast development experience

## Tech Stack

- **Frontend**: React 19 with TypeScript 5.8
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 3.4
- **Database**: Firebase Firestore
- **Drag & Drop**: @dnd-kit (modern, React 19 compatible)
- **Date Handling**: date-fns 3.6
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v18 or higher, v22 recommended)
- npm or yarn
- Firebase project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd weekly-planner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**

   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Get your Firebase configuration

4. **Configure Firebase**

   Update the Firebase configuration in `src/firebase/config.ts`:
   ```typescript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-auth-domain",
     projectId: "your-project-id",
     storageBucket: "your-storage-bucket",
     messagingSenderId: "your-messaging-sender-id",
     appId: "your-app-id"
   };
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will open at [http://localhost:5173](http://localhost:5173).

## Usage

### Adding Tasks
1. Click the "Add Task" button
2. Fill in the task details (title, description, day, priority, status)
3. Click "Add Task" to save

### Managing Tasks
- **Edit**: Click the edit icon on any task card
- **Delete**: Click the trash icon on any task card
- **Update Progress**: Drag tasks between "To Do", "In Progress", and "Completed" columns

### Navigation
- Use the arrow buttons to navigate between weeks
- The current week is displayed in the header

## Project Structure

```
src/
├── components/          # React components
│   ├── TaskCard.tsx    # Individual task card component
│   ├── TaskForm.tsx    # Task creation/editing form
│   └── WeekView.tsx    # Weekly calendar view
├── firebase/           # Firebase configuration
│   └── config.ts       # Firebase setup
├── services/           # API services
│   └── taskService.ts  # Task CRUD operations
├── types/              # TypeScript type definitions
│   └── index.ts        # Application types
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## Available Scripts

- `npm run dev` - Start the development server (Vite)
- `npm run build` - Build the app for production
- `npm run preview` - Preview the production build
- `npm run lint` - Run ESLint

## Firebase Security Rules

Make sure to set up appropriate Firestore security rules. Here's a basic example:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{taskId} {
      allow read, write: if true; // For development - customize for production
    }
  }
}
```

## Why Vite?

- **Lightning Fast**: Instant server start and hot module replacement
- **Modern Build**: Uses ES modules and native browser features
- **TypeScript 5.8 Support**: Full support for the latest TypeScript features
- **React 19 Compatible**: Built for the latest React version
- **Better DX**: Superior developer experience with fast refresh

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
