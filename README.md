# Quiz Card Learning App

A flashcard learning application built with Next.js and Firebase, featuring adaptive learning algorithms and multiple study modes.

## Features

### Authentication
- Firebase Authentication (Google Sign-in, Email/Password)
- Secure user data management

### Deck Management
- Create, read, update, and delete decks via Firestore
- Add, edit, and delete cards within decks
- Track learning progress per card

### Learning Modes

#### 1. **Normal Study Mode (Typing)**
- Type answers to test your knowledge
- Forced re-typing on incorrect answers
- Multi-round learning system:
  - Round 1: Study all cards
  - Round 2+: Only review incorrectly answered cards
  - Continue until all cards are mastered

#### 2. **Normal Study Mode (Multiple Choice)**
- Select answers from multiple choices
- Reduces typing burden while maintaining active recall
- Same multi-round learning system as typing mode

#### 3. **Flashcard Mode**
- Click cards to reveal answers
- Mark cards as "Known" or "Unknown"
- Quick review for rapid memorization

#### 4. **Test Mode**
- Customize question count (1 to all cards)
- Adjust typing/multiple choice ratio (0-100%)
- Randomized question order
- Final results with correct/incorrect breakdown

### Progress Tracking
- **Mastery Rate**: Visual progress bar showing overall achievement
- **Attempt Count**: Track how many times each card was answered incorrectly
- **Session Results**: View correct and incorrect answers after each round
- **Completion Screen**: See attempt counts for all cards when achieving 100%

### Additional Features
- **Random Shuffle**: Optional randomization of card order
- **Dark Mode**: Full dark mode support
- **Responsive Design**: Mobile-friendly interface
- **Progress Reset**: Clear all progress to start fresh

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Firebase Project

1. Access [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication
   - Enable Google Sign-in
   - Enable Email/Password authentication
4. Create Firestore Database (can start in test mode)

### 3. Configure Environment Variables

Create a `.env.local` file with the following values:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

These values can be obtained from Firebase Console > Project Settings.

### 4. Configure Firestore Security Rules

Set up Firestore security rules in Firebase Console:

1. Open Firebase Console > Firestore Database > Rules tab
2. Copy and paste the contents of `firestore.rules` file
3. Click "Publish"

These rules ensure users can only access decks they created.

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to access the application.

## Project Structure

```
quiz-app/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── decks/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── edit/
│   │   │   │   │       └── page.tsx  # Card editing page
│   │   │   │   └── new/
│   │   │   │       └── page.tsx      # Deck creation page
│   │   │   └── study/
│   │   │       └── [id]/
│   │   │           ├── page.tsx      # Study mode selection
│   │   │           ├── flashcard/
│   │   │           │   └── page.tsx  # Flashcard mode
│   │   │           ├── typing/
│   │   │           │   └── page.tsx  # Typing mode
│   │   │           ├── choice/
│   │   │           │   └── page.tsx  # Multiple choice mode
│   │   │           └── test/
│   │   │               └── page.tsx  # Test mode
│   │   ├── login/
│   │   │   └── page.tsx              # Login page
│   │   ├── layout.tsx                 # Root layout
│   │   └── page.tsx                   # Dashboard
│   ├── lib/
│   │   ├── store/
│   │   │   ├── deckStore.ts          # Firestore operations for decks
│   │   │   └── cardStatusStore.ts    # Card progress tracking
│   │   ├── firebase.ts             # Firebase initialization
│   │   └── auth-context.tsx        # Authentication context
│   └── types/
│       └── quiz.ts                 # Type definitions
├── firestore.rules                 # Firestore security rules
├── .env.local                      # Environment variables (must create)
└── package.json
```

## Tech Stack

- **Framework**: Next.js 16.1.6
- **Language**: TypeScript
- **Backend**: Firebase (Authentication, Firestore)
- **Styling**: Tailwind CSS
- **Build Tool**: Turbopack

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase authentication domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |

## Data Structure

### Deck Document
```typescript
{
  id: string;
  title: string;
  userId: string;
  createdAt: Timestamp;
  cards: Card[];
  userStatus?: {
    [userId: string]: {
      [cardId: string]: {
        isAnswered: boolean;
        isCorrect: boolean;
        attemptCount?: number;
      }
    }
  }
}
```

### Card Object
```typescript
{
  id: string;
  question: string;
  answer: string;
}
```

## Learning Algorithm

1. **Initial Round**: Study all cards in the deck
2. **Subsequent Rounds**: Only review cards answered incorrectly in previous rounds
3. **Attempt Tracking**: 
   - Correct answers: Don't increment attempt count
   - Incorrect answers: Increment attempt count
4. **Completion**: When all cards are answered correctly, display final statistics

## Development

Build the project:

```bash
npm run build
```

Run in production:

```bash
npm start
```

## License

MIT
