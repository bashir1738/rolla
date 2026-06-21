import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const ACTIVE = '#D4A017';   // gold
const INACTIVE = '#6B7C74'; // muted

function TabIcon({
  icon, label, focused,
}: { icon: IoniconsName; label: string; focused: boolean }) {
  const color = focused ? ACTIVE : INACTIVE;
  return (
    <View className="items-center justify-center gap-1" style={{ width: 72 }}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={{ color }} className="text-[11px] font-semibold">
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarItemStyle: { height: '100%', justifyContent: 'center' },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#EDE6D6',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="home-outline" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="circles"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="people-circle-outline" label="Circles" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="save"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="leaf-outline" label="Save" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="receipt-outline" label="History" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="person-outline" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
