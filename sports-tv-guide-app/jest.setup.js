// Mock AsyncStorage in tests. Persistence (zustand persist middleware in the
// game store) imports the native module, which has no implementation under
// Jest; the package ships an in-memory mock for exactly this purpose.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
