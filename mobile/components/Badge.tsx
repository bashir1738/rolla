import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type BadgeVariant = 'active' | 'recruiting' | 'completed' | 'yourTurn' | 'matured' | 'locked';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const VARIANTS: Record<BadgeVariant, {
  className: string; textClass: string; label: string; icon?: IoniconsName; iconColor?: string;
}> = {
  active:     { className: 'bg-green-50 border border-green-200',    textClass: 'text-primary',   label: 'Active',    icon: 'radio-button-on', iconColor: '#4ADE80' },
  recruiting: { className: 'bg-amber-50 border border-amber-200',    textClass: 'text-accent',    label: 'Recruiting',icon: 'person-add-outline', iconColor: '#D4A017' },
  completed:  { className: 'bg-gray-100 border border-gray-200',     textClass: 'text-muted',     label: 'Completed', icon: 'checkmark-circle', iconColor: '#8FA98C' },
  yourTurn:   { className: 'bg-accent border border-accent',         textClass: 'text-primary',   label: 'Your turn!',icon: 'gift', iconColor: '#1A3C2B' },
  matured:    { className: 'bg-green-50 border border-green-200',    textClass: 'text-primary',   label: 'Ready',     icon: 'checkmark-circle', iconColor: '#4ADE80' },
  locked:     { className: 'bg-gray-50 border border-gray-200',      textClass: 'text-muted',     label: 'Locked',    icon: 'lock-closed-outline', iconColor: '#8FA98C' },
};

export function Badge({ variant, size = 'md' }: { variant: BadgeVariant; size?: 'sm' | 'md' }) {
  const v = VARIANTS[variant];
  const px = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <View className={`flex-row items-center gap-1 rounded-full self-start ${v.className} ${px}`}>
      {v.icon && <Ionicons name={v.icon} size={size === 'sm' ? 10 : 11} color={v.iconColor} />}
      <Text className={`font-semibold ${textSize} ${v.textClass}`}>{v.label}</Text>
    </View>
  );
}
