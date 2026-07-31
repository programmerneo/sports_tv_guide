# 🚀 Sports TV Guide - Development Roadmap

Track of what's in progress and what still needs work.

---

## 🚧 Phase 3: Feature Implementation (IN PROGRESS / NEEDED)

### High Priority (Recommended First)

#### Standings — College Sports
- ✅ Add `basketball-college` standings to UI (shipped in commit `03e76da`)
- ✅ Add `football-college` standings (backend + UI) — all 6 touch-points done
  - [x] Add ESPN URL to `STANDINGS_URLS` in `constants/espn.py` (no `level`/`groups` param — that
        endpoint is already FBS-scoped, 11 conference groups) plus `STANDINGS_EXTRA_STATS` and
        `POSTSEASON_SPORT_PATHS` (so NCAAF standings are season-gated, late Aug → ~Jan 21)
  - [x] Add route to `api/standings.py` (`_PATH_TO_SPORT`) — `/api/standings/football-college`
        and `/api/standings/football-college/status`
  - [x] Add `football-college` to `STANDINGS_SPORTS` in `StandingsScreen.tsx`
  - [x] Define column config in `COLUMNS` — W-L, Conf, PF, PA (**no** PCT: ESPN's college
        football standings carry no `winPercent` stat)
  - [x] Add label/emoji to `SPORT_INFO` ('NCAAF' 🏈)
  - [x] Add to `StandingsSportType` in `src/types/index.ts`
- ✅ Bug fixed along the way: `football-college` was missing from
  `DEFAULT_USER_PREFERENCES.selectedSports`, so CFB games were never fetched and never appeared
  in the TV guide at all. Also added to `HOME_TO_STANDINGS_SPORT`, giving NCAAF a Home-screen
  "🏆 Standings" link gated on season status (correctly hidden while out of season).
- ✅ Two general standings fixes: `_extract_stats` now keeps the *first* occurrence of a stat
  name (college endpoints repeat every name once per split), which also fixed latent value
  corruption for basketball-college; `_format_team` prefers ESPN's pre-joined `overall` record
  string when present.

#### Favorites Functionality
FavoritesScreen is shipped: shows saved games (sorted by start time), star toggle to
add/remove, wired to the store, and persisted via AsyncStorage. Remaining:
- [ ] Display favorite teams (currently games only)
- [ ] Filter by sport

**Estimated:** 1 hour

#### Search Functionality
**Next up.** `src/screens/SearchScreen.tsx` is still a 28-line placeholder (renders two static
`<Text>` lines) and isn't registered in any navigator — this needs building from scratch, not
finishing.
- 📋 Implement SearchScreen (and register it in `src/App.tsx`)
  - [ ] Search by team name
  - [ ] Search by sport
  - [ ] Search by date
  - [ ] Display results
- 📋 Add search logic to store

**Estimated:** 2-3 hours

#### Settings/Profile
- 📋 Expand ProfileScreen (dark mode toggle already shipped)
  - [ ] Edit timezone selection
  - ✅ Toggle notifications (global on/off, shipped alongside game-start reminders)
  - [ ] View favorite teams list
  - [ ] Clear cache button

**Estimated:** 2 hours

#### Notifications (Reminders)
- ✅ Game-start reminders shipped: 🔔 button on `GameCard`/`BoxScoreModal` schedules a local
  notification `REMINDER_LEAD_MINUTES` before tip-off, tap again to cancel, global toggle in
  Profile. Uses `expo-notifications` on iOS/Android; web uses the browser `Notification` API +
  `setTimeout` (foreground-only — see Known Limitations). See `src/services/notificationService.native.ts`
  / `.web.ts`.
- 📋 Still open:
  - [ ] Live/close-game alerts (score-based, requires polling + diffing — no ESPN push/webhook)
  - [ ] Daily digest notification
  - [ ] Real notification history (`NotificationsScreen` now correctly filters live/upcoming games
        down to those with an active scheduled reminder, favorites first, with per-row cancel —
        but it's still a view of *pending* reminders, not a log of actually sent ones)
  - [ ] Configurable lead time (currently a single fixed value)

### Medium Priority

#### Offline Support
- 📋 Cache games data locally
- 📋 Show cached data when offline
- 📋 Sync when online again

**Estimated:** 2-3 hours

#### Error Boundaries
- 📋 Add ErrorBoundary component
- 📋 Graceful error handling
- 📋 Error logging

**Estimated:** 1 hour

#### Loading States
- 📋 Add skeleton loaders
- 📋 Better loading indicators
- 📋 Progress feedback

**Estimated:** 1-2 hours

#### Testing
- 📋 Unit tests for components
- 📋 API client tests
- 📋 State management tests
- 📋 Integration tests

**Estimated:** 4-5 hours

### Lower Priority (Polish)

#### UI/UX Polish
- 📋 Add animations
- 📋 Haptic feedback for interactions
- 📋 Loading skeletons
- 📋 Smooth page transitions
- 📋 Pull-to-refresh animation

**Estimated:** 3-4 hours

#### Accessibility (a11y)
- 📋 Screen reader support
- 📋 Keyboard navigation
- 📋 Alt text for all images

**Estimated:** 2-3 hours

#### Dark Mode
Dark theme, color scheme (`constants/theme.ts`), and the Profile toggle are shipped.
Remaining:
- [ ] System theme detection (follow OS light/dark via `Appearance`/`useColorScheme`)

**Estimated:** 30 min

#### App Icons & Splash Screen
- 📋 Generate app icons (multiple sizes)
- 📋 Create splash screen design
- 📋 Update assets

**Estimated:** 1 hour

---

## 🔧 Known Issues & Limitations

### Current Limitations
1. **Sports Data Source**
   - Only supports sports your backend provides
   - May need to add more sports endpoints

2. **Game Details**
   - Boxscore depends on ESPN API data availability
   - Some games may have limited stats

3. **Notifications**
   - Game-start reminders (single fixed lead time) are implemented via `expo-notifications`
     on iOS/Android.
   - Web reminders use the browser `Notification` API + `setTimeout` and only fire while the
     tab stays open — there's no OS-level background scheduling for web pages, and a real
     background/closed-tab experience would require a push server (out of scope for now).
   - Live/close-game alerts, daily digest, and real notification history are still not built.

4. **Performance**
   - Large game lists may need virtualization
   - Images are emojis (not optimized images)

### Potential Issues to Monitor
- [ ] API timeout handling on slow networks
- [ ] Cache invalidation edge cases
- [ ] State sync across navigation
- [ ] Memory leaks with subscriptions
- [ ] Keyboard layout issues on small devices

---

## 📋 Not Yet Implemented

### Authentication
- [ ] User login/signup
- [ ] User profiles
- [ ] Syncing favorites to backend
- [ ] Social sharing

### Advanced Features
- [ ] Video highlights integration
- [ ] Betting odds display
- [ ] Fantasy sports integration
- [ ] Social comments/reactions
- [ ] Live chat during games
- [ ] Replay notifications

### Backend Integration
- [ ] WebSocket for real-time updates
- [ ] User account system
- [ ] Favorites syncing
- [ ] Analytics tracking
- [ ] Push notification service

---

## 📊 Implementation Order (Recommended)

**Week 1:**
1. College football standings
2. Finish Favorites (favorite-teams list + sport filter)

**Week 2:**
3. Implement Search
4. Implement Notifications UI + logic
5. Add error boundaries

**Week 3:**
6. Profile/Settings screen
7. Testing suite

**Week 4:**
8. Polish UI/animations
9. Accessibility improvements
10. App icons/splash screen

---

## 🎯 Milestones

### V1.0 (Next)
- [ ] Favorites functionality
- [ ] Search capability
- ✅ Notification reminders (game-start only; live alerts/digest still open)
- [ ] Settings/profile
- [ ] Full test coverage

### V1.1 (Later)
- [ ] Offline support
- [ ] Advanced search
- [ ] Social features
- [ ] Analytics

### V2.0 (Future)
- [ ] User accounts
- [ ] Cloud sync
- [ ] Advanced features
- [ ] Performance optimizations

---

## 🔧 Technical Debt & Improvements

### Code Quality
- [ ] Add JSDoc comments to all components
- [ ] Improve error messages
- [ ] Standardize error handling
- [ ] Extract magic strings to constants

### Performance
- [ ] Implement FlatList virtualization for large lists
- [ ] Optimize re-renders with useMemo
- [ ] Code splitting by screen
- [ ] Image optimization

### Testing
- [ ] Add unit tests for utils
- [ ] Add integration tests
- [ ] Add E2E tests
- [ ] Improve test coverage

### Documentation
- [ ] API client usage guide
- [ ] Component prop documentation
- [ ] Setup troubleshooting guide
- [ ] Architecture decision records (ADR)

---

## 📦 Dependencies to Consider

Already installed (see `package.json`): `@react-native-async-storage/async-storage`, `react-native-reanimated`, `react-native-gesture-handler`, `expo-local-authentication`, `expo-secure-store`, `expo-notifications` (game-start reminders, iOS/Android only — web uses the browser `Notification` API instead).

Still to add when their feature lands:
- 📦 `expo-linear-gradient` - Background gradients
- 📦 `lottie-react-native` - Animations

---

## ✨ Quick Wins (Easy to Implement)

1. **Pull-to-Refresh Animation** (30 min)
   - Add visual feedback when refreshing

2. **Better Empty State** (1 hour)
   - More helpful messaging
   - Suggest actions

3. **Game Notifications** (2 hours)
   - Toast notifications for live updates
   - Sound effect option

---

## 📞 Questions to Answer

Before implementing new features, consider:

1. **Backend Support** - Does the API support this?
2. **Performance** - Will it impact performance?
3. **UX** - Does it improve user experience?
4. **Priority** - Is this user-requested?
5. **Effort** - Time to implement vs. benefit?

---

## 🚀 Getting Help

### For Feature Implementation
1. Check this TODO for priority
2. Review DEVELOPMENT.md for patterns
3. Look at existing components for examples
4. Ask if unclear

### For Bug Fixes
1. Document the issue
2. Create a minimal reproduction
3. Check console logs
4. Use React DevTools/Expo debugger

---

**Last Updated:** July 31, 2026
**Current Status:** Feature Development Phase
**Next Priority:** Search — build `SearchScreen` and register it in the navigator (College football
standings, Favorites, game-start reminders, dark mode & persistence all shipped)
