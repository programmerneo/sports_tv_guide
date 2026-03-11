# 👨‍💻 Development Guide

Development patterns, conventions, and best practices for the Sports TV Guide app.

## Code Style & Conventions

### TypeScript

- **Always use type hints** for function parameters and return values
- **Use interfaces** for complex object structures
- **Export types** from `src/types/index.ts`
- **Use strict mode** (enabled in `tsconfig.json`)

```typescript
// ✅ Good
interface Game {
  id: string;
  homeScore: number;
  awayScore: number;
  status: GameStatus;
}

function updateScore(game: Game, homeScore: number, awayScore: number): void {
  // ...
}

// ❌ Avoid
function updateScore(game, homeScore, awayScore) {
  // ...
}
```

### Component Structure

All components follow this structure:

```typescript
/**
 * Component description - what it does and where it's used
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { COLORS } from '@constants/index';

interface ComponentProps {
  title: string;
  onPress?: () => void;
  count?: number;
}

const MyComponent: React.FC<ComponentProps> = ({
  title,
  onPress,
  count = 0,
}) => {
  // Implementation
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.DARK_TEXT,
  },
});

export default MyComponent;
```

### Naming Conventions

```typescript
// Components: PascalCase
const GameCard = () => {};
const TVGuideGrid = () => {};

// Functions: camelCase
function formatTime(date: Date) {}
function getGamesBySport(sport: string) {}

// Constants: UPPER_SNAKE_CASE
const API_TIMEOUT = 10000;
const CACHE_DURATION = 45000;

// Interfaces/Types: PascalCase
interface Game {}
type SportType = 'football-nfl' | 'basketball-college';

// Variables: camelCase
const gameList = [];
let isLoading = false;
```

## State Management with Zustand

### Using the Store

```typescript
// In a component
import { useGameStore } from '@store/gameStore';

const MyComponent = () => {
  const games = useGameStore((state) => state.games);
  const setLoading = useGameStore((state) => state.setLoading);

  // Use games and setLoading...
};
```

### Creating Selectors

```typescript
// In src/store/gameStore.ts
export const getLiveGames = (state: GameState): Game[] => {
  return getAllGames(state).filter((g) => g.status === 'in_progress');
};

// In a component
const liveGames = useGameStore((state) => getLiveGames(state));
```

## API Integration

### Adding New API Methods

```typescript
// In src/services/api.ts
class ApiService {
  async getNewData(param: string): Promise<SomeType> {
    const cacheKey = `newdata:${param}`;

    // Check cache
    const cached = this.getCachedData<SomeType>(cacheKey, CACHE_DURATION);
    if (cached) return cached;

    try {
      const url = `${API_BASE_URL}/api/endpoint/${param}`;
      const response = await this.fetchWithTimeout(url);
      const data = await response.json();

      this.setCacheData(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Failed to fetch data:', error);
      throw error;
    }
  }
}
```

## Styling Patterns

### Using Colors

```typescript
import { COLORS } from '@constants/index';

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.BORDER,
  },
  text: {
    color: COLORS.DARK_TEXT,
  },
});
```

### Responsive Layout

```typescript
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const columnWidth = (screenWidth - 32) / 3;

const styles = StyleSheet.create({
  column: {
    width: columnWidth,
  },
});
```

## Common Patterns

### Loading State

```typescript
const [loading, setLoading] = useState(false);

useEffect(() => {
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiService.getData();
      setData(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  loadData();
}, []);

if (loading) {
  return <ActivityIndicator />;
}
```

### Error Handling

```typescript
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      setError(null);
      const data = await apiService.getData();
      // Process data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
  };

  fetchData();
}, []);

if (error) {
  return <ErrorComponent message={error} onRetry={fetchData} />;
}
```

### Modal Pattern

```typescript
const [modalVisible, setModalVisible] = useState(false);
const [selectedItem, setSelectedItem] = useState<Item | null>(null);

return (
  <>
    <TouchableOpacity onPress={() => {
      setSelectedItem(item);
      setModalVisible(true);
    }}>
      Open
    </TouchableOpacity>

    <Modal
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
      animationType="slide"
    >
      {/* Modal content */}
    </Modal>
  </>
);
```

## Performance Optimization

### Memoization

```typescript
// Memoize expensive calculations
const gamesByTime = useMemo(() => {
  return games.reduce((acc, game) => {
    const time = getTimeSlot(game);
    if (!acc[time]) acc[time] = [];
    acc[time].push(game);
    return acc;
  }, {});
}, [games]);

// Memoize callbacks
const handlePress = useCallback(() => {
  // Handle action
}, [dependency]);
```

### FlatList for Long Lists

```typescript
<FlatList
  data={games}
  renderItem={({ item }) => <GameCard game={item} />}
  keyExtractor={(item) => item.id}
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
/>
```

## Testing

### Component Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react-native';
import GameCard from '@components/GameCard';

describe('GameCard', () => {
  it('renders game information', () => {
    const game: Game = {
      id: '1',
      homeTeam: { id: '1', name: 'Lakers', abbreviation: 'LAL' },
      awayTeam: { id: '2', name: 'Celtics', abbreviation: 'BOS' },
      // ... other fields
    };

    render(<GameCard game={game} />);

    expect(screen.getByText('Lakers')).toBeDefined();
    expect(screen.getByText('Celtics')).toBeDefined();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<GameCard game={mockGame} onPress={onPress} />);

    fireEvent.press(screen.getByTestId('game-card'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

## Debugging

### Console Logging

```typescript
// Development only
if (__DEV__) {
  console.log('Debug info:', value);
}

// Error logging
console.error('Error occurred:', error, { context: value });

// Performance logging
console.time('fetchData');
const data = await fetch(url);
console.timeEnd('fetchData');
```

### Accessing Expo DevTools

```
1. Press 'd' in terminal (or 'm' on Android)
2. Select "Debugger"
3. Opens developer tools in browser
```

### React Native Debugger

```bash
# Install globally
npm install -g react-native-debugger

# Run your app
npm start

# Open React Native Debugger
react-native-debugger
```

## Commit Message Guidelines

```
Format: <type>(<scope>): <subject>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Code style (formatting, etc)
- refactor: Code refactoring
- perf: Performance improvement
- test: Adding tests
- chore: Build, dependencies, etc

Examples:
feat(home): add sport filtering tabs
fix(api): handle null response from ESPN API
docs(setup): update installation instructions
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feat/feature-name

# Make changes and commit
git add .
git commit -m "feat(component): add new feature"

# Push to remote
git push origin feat/feature-name

# Create pull request on GitHub
```

## File Organization

```
src/
├── components/
│   ├── GameCard/
│   │   ├── GameCard.tsx
│   │   └── GameCard.styles.ts (optional)
│   └── ...
├── screens/
│   ├── HomeScreen.tsx
│   └── ...
├── services/
│   ├── api.ts
│   └── ...
├── store/
│   └── gameStore.ts
├── types/
│   └── index.ts
├── constants/
│   └── index.ts
└── App.tsx
```

## Hot Tips

1. **Use TypeScript strict mode** - Catches errors early
2. **Keep components small** - Easier to test and maintain
3. **Extract magic numbers** - Use constants from `src/constants/`
4. **Memoize selectors** - Improve performance
5. **Use absolute imports** - Cleaner code structure
6. **Document complex logic** - Help future developers
7. **Test edge cases** - Unexpected data formats
8. **Performance first** - Monitor with Expo DevTools

## Useful Commands

```bash
# Format code
npm run prettier

# Lint
npm run lint

# Type check
npm run type-check

# Test
npm test

# Clean build
npm start --clear

# View project info
expo publish:history
```

## Resources

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [React Hooks Guide](https://react.dev/reference/react/hooks)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zustand Guide](https://github.com/pmndrs/zustand)

---

**Happy coding! 🚀**
