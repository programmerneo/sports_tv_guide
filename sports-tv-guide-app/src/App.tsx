/**
 * Main App component with navigation setup
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '@screens/HomeScreen';
import BracketScreen from '@screens/BracketScreen';
import StandingsScreen from '@screens/StandingsScreen';
import SearchScreen from '@screens/SearchScreen';
import NotificationsScreen from '@screens/NotificationsScreen';
import ProfileScreen from '@screens/ProfileScreen';

import { useGameStore } from '@store/gameStore';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Home Stack Navigator
 */
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'default',
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Bracket" component={BracketScreen} />
    </Stack.Navigator>
  );
}

/**
 * Bottom Tab Navigator
 */
function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e0e0e0',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Standings"
        component={StandingsScreen}
        options={{
          title: 'Standings',
          tabBarLabel: 'Standings',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>🏆</Text>,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Search',
          tabBarLabel: 'Search',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>🔍</Text>,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          tabBarLabel: 'Notifications',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>🔔</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size, color }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Main App component
 */
export default function App() {
  const [appReady, setAppReady] = useState(false);
  const preferences = useGameStore((state) => state.preferences);

  useEffect(() => {
    // Initialize app
    const initializeApp = async () => {
      try {
        // Add any initialization logic here (load preferences, etc.)
        setAppReady(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setAppReady(true); // Still continue despite errors
      }
    };

    initializeApp();
  }, []);

  if (!appReady) {
    return null; // Show splash screen or loading state
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'default',
          }}
        >
          <Stack.Screen name="MainTabs" component={BottomTabs} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style={preferences.darkModeEnabled ? 'light' : 'dark'} />
    </SafeAreaProvider>
  );
}

// Simple Text component for tab icons (temporary)
import { Text } from 'react-native';
