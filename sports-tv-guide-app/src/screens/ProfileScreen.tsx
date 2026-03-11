import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@constants/index';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile Screen</Text>
      <Text style={styles.subtext}>User settings and preferences</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.LIGHT_BG,
  },
  text: { fontSize: 18, fontWeight: 'bold', color: COLORS.DARK_TEXT },
  subtext: { marginTop: 8, fontSize: 14, color: COLORS.LIGHT_TEXT },
});
