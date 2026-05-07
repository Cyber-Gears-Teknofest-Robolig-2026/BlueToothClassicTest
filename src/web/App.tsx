// WEB VERSION (src/web/App.tsx)

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { styles } from './styles';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Gifted Coder Land</Text>
    </View>
  );
}