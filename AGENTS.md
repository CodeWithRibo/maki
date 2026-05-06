# Project Brief: "Maki" - Mobile-First Flashcard Learning App

## 1. Project Overview
Act as an expert Front-End Engineer and UI/UX Designer. Please build a modern, sleek, mobile-first web application called **"Maki"**. It is a flashcard learning tool heavily inspired by the UI/UX of the Vaia app.

The application must be fully responsive but optimized for mobile viewports. Use **React**, **Tailwind CSS**, and **Lucide React** for icons. Implement smooth animations for interactions (e.g., bottom sheets sliding up, color transitions on answers, and animated progress bars) using CSS or Framer Motion.

## 2. Global UI/UX Design System (Vaia-Inspired)
* **Theme:** Deep Dark Mode.
* **Color Palette:**
    * Background: Deep Navy Blue (e.g., `bg-slate-900` or `#0B132B`).
    * Card Background: Slightly lighter Navy/Surface color (e.g., `bg-slate-800` or `#1C2541`).
    * Text: Pure White for primary, Light Gray for secondary (`text-slate-400`).
    * Highlights: Bright Yellow/Gold for emphasized keywords in flashcards.
    * Status/Reaction Colors:
        * Bad / Wrong: Soft Red (`#EF4444`)
        * OK: Orange/Brown (`#F59E0B`)
        * Good / Correct: Emerald Green (`#10B981`)
        * Perfect: Bright Blue (`#3B82F6`)
* **Animation Specs:** All state changes (like selecting an answer or moving to the next card) should feel fluid. Use spring physics for pop-ups and smooth easing for width/fill transitions.

## 3. Screen 1: Library (Home View)
This is the main dashboard for the user.
* **Header:** Large bold text "Library" at the top.
* **Bottom Navigation Bar:** Fixed at the bottom. Icons: Home, Library (Active/Highlighted), Explore, Profile.
* **Deck List:**
    * Group by categories (e.g., "Last 7 days" and "Archived").
    * **Deck Card Component:**
        * Contains the Title (e.g., "NETWORK TECHNOLOGY").
        * Subtitle showing the number of flashcards (e.g., "40 Flashcards").
        * A 3-dot vertical menu icon on the bottom right of the card.
    * **3-Dot Menu Action (Bottom Sheet):** When clicked, slide up a bottom sheet with the following options:
        * ✏️ Edit
        * 📦 Archive (If currently active) OR 📂 Unarchive (If currently archived)
        * 🗑️ Delete Study Set (Text colored Red).
* **Floating Action Button (FAB):** A prominent "+" button at the bottom right (above the nav bar) to create a new deck.

## 4. Screen 2: Direct Flashcard Study View
*Crucial UX Flow:* When a user taps a Deck Card from the Library, **bypass any intermediate menus or tabs**. Take them *directly* into the Flashcard learning mode.

* **Top Bar:** Back arrow (returns to Library), Deck Title (truncated if long), Settings Icon (⚙️).
* **Aesthetic Animated Progress Bar:** Immediately below the top header, implement a sleek, highly visual progress bar.
    * **Design:** It should have rounded caps and a subtle glowing shadow effect.
    * **Animation:** As the user answers questions, the bar should fill up with a smooth, continuous sliding animation (not a rigid jump).
    * **Dynamic Coloring:** The filled segments should dynamically reflect the user's reactions (e.g., the bar segments out into 50% green, 20% red, etc., based on their history in that session).
* **Main Flashcard Area:**
    * Displays the question. Support rendering bold/highlighted text (in yellow) for emphasis.
    * Displays Multiple Choice options (A, B, C).
* **Interaction & Gamification:**
    * When the user taps an option, provide *instant feedback*.
    * If **Correct**: The selected button instantly gets a green border/background.
    * If **Wrong**: The selected button gets a red background with an "X" icon, and the correct answer simultaneously highlights in green.
    * **Toast/Bottom Action Area:** Upon answering, slide up a small fun gamification banner (e.g., "Almost! 🙈" or "Awesome! 🎉") alongside a prominent "Next" arrow button to proceed to the next card.
* **Self-Rating Bar (Bottom):** Below the card, fixed above the screen bottom. Four distinct colored buttons: [Bad (Red)], [OK (Orange)], [Good (Green)], [Perfect (Blue)].

## 5. Screen 3: Settings (Bottom Sheet Modal)
Triggered by clicking the ⚙️ icon in the Study View.
* **Title:** "Flashcard settings" with a close (X) icon.
* **Sort By:** A dropdown/select set to "Newest first" (Descending) by default.
* **Filter by Rating:** A row of the 4 reaction icons (Bad, OK, Good, Perfect). Users can toggle these to only study cards they marked as "Bad", for example.
* **Action Buttons:** A layout at the bottom with a secondary "Reset" button and a primary highlighted "Apply" button.

## 6. Mock Data Initialization
Please include a robust mock state array using React `useState` so the app is fully interactive upon rendering. Provide at least 2 Active Decks and 1 Archived Deck, each containing 3-4 multiple-choice flashcards.

Focus heavily on the UI polish, padding, border-radiuses (rounded corners), and a premium dark-mode aesthetic. Produce the complete, functional code.