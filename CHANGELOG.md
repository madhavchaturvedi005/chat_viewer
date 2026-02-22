# Changelog

## Search Feature Improvements

### Fixed Issues:
1. **Navigation Bug**: Fixed the issue where navigating to the second match would jump back to the first match
   - Separated the scroll logic from the state update
   - Now properly cycles through all matches

2. **Auto-scroll Interference**: Added user scroll detection
   - Search auto-scroll only happens when using navigation buttons
   - Users can freely scroll and read messages after searching
   - Auto-scroll pauses for 1 second after manual scrolling

3. **Instagram Missing Controls**: Added up/down arrow navigation to Instagram view
   - Both WhatsApp and Instagram now have identical search functionality
   - Match counter, navigation arrows, and close button

### Features:
- Search highlights all matches (yellow) with current match in orange
- Navigate between matches using up/down arrow buttons
- Match counter shows current position (e.g., "2/5")
- Smooth auto-scroll to current match (only when using arrows)
- Close button (X) to exit search mode
- Works in both WhatsApp and Instagram views
