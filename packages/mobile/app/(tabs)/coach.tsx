import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows, gradients } from '../../src/theme/tokens';
import { Header } from '../../src/components/Header';
import { Card } from '../../src/components/Card';
import { DisclaimerBar } from '../../src/components/DisclaimerBar';

interface Message {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  time: string;
}

export default function CoachScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'coach',
      text: "Hello! I'm your AI Skin Coach. I have your sensitive skin profile, your 3-step routine, and your Day 14 scan progress in memory. How can I support your skin today?",
      time: '10:00 AM'
    }
  ]);
  const [inputText, setInputText] = useState<string>('');

  const quickChips = [
    { label: 'Can I use this tonight?', icon: 'moon-outline' as const },
    { label: 'My face feels dry today', icon: 'water-outline' as const },
    { label: 'Make routine simpler', icon: 'shield-checkmark-outline' as const },
    { label: 'What changed since last week?', icon: 'analytics-outline' as const }
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text,
      time: 'Just now'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Deterministic cosmetic coach simulation
    setTimeout(() => {
      let replyText = "Based on your current routine, you're doing great! Keep your focus on gentle moisturization tonight.";
      const lower = text.toLowerCase();
      if (lower.includes('dry')) {
        replyText = "Since your skin is feeling dry today, apply your moisturizer while your skin is still slightly damp after cleansing, and pause any exfoliating steps tonight.";
      } else if (lower.includes('simpler')) {
        replyText = "Absolutely. We can streamline down to your core essentials: just your gentle cleanser, moisturizer, and daily SPF. Consistency with three core products is plenty.";
      } else if (lower.includes('melanoma') || lower.includes('cancer') || lower.includes('cure') || lower.includes('infection')) {
        replyText = "I am a cosmetic skin coach and cannot diagnose or treat medical conditions. If you notice an unusual, painful, or rapidly changing area, please consult a board-certified dermatologist.";
      } else if (lower.includes('tonight')) {
        replyText = "Yes, your Centella Calming Serum is completely safe to layer tonight under your Barrier Moisturizer. It contains zero conflicting actives.";
      }

      const coachMsg: Message = {
        id: `c_${Date.now()}`,
        sender: 'coach',
        text: replyText,
        time: 'Just now'
      };
      setMessages(prev => [...prev, coachMsg]);
    }, 700);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Header />

      {/* Memory Grounding Pill Header */}
      <View style={styles.groundingBar}>
        <View style={styles.groundingDot} />
        <Text style={styles.groundingText}>
          GROUNDED MEMORY: Sensitive Baseline • 3-Step AM/PM • Zero Irritation
        </Text>
      </View>

      <ScrollView
        style={styles.messageScroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(msg => (
          <View
            key={msg.id}
            style={[
              styles.messageRow,
              msg.sender === 'user' ? styles.messageRowUser : styles.messageRowCoach
            ]}
          >
            {msg.sender === 'coach' && (
              <View style={styles.coachAvatarMini}>
                <Ionicons name="sparkles" size={14} color={colors.goldDark} />
              </View>
            )}

            <View
              style={[
                styles.messageBubble,
                msg.sender === 'user' ? styles.userBubble : styles.coachBubble
              ]}
            >
              <Text
                style={[
                  typography.body,
                  msg.sender === 'user' ? styles.userText : styles.coachText
                ]}
              >
                {msg.text}
              </Text>
              <Text
                style={[
                  styles.messageTime,
                  msg.sender === 'user' ? styles.userTime : styles.coachTime
                ]}
              >
                {msg.time}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Quick Suggestion Chips */}
      <View style={styles.chipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {quickChips.map((chip, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.8}
              onPress={() => handleSend(chip.label)}
              style={styles.chip}
            >
              <Ionicons name={chip.icon} size={13} color={colors.goldDark} style={{ marginRight: 4 }} />
              <Text style={styles.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Luxury Chat Input Bar */}
      <View style={styles.inputBarContainer}>
        <TextInput
          style={styles.inputField}
          placeholder="Ask your Skin Coach..."
          placeholderTextColor={colors.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
        />

        <TouchableOpacity
          style={[styles.sendButton, !!inputText.trim() && styles.sendButtonActive]}
          activeOpacity={0.8}
          onPress={() => handleSend()}
        >
          <Ionicons
            name="arrow-up"
            size={18}
            color={colors.textInverse}
          />
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: spacing.base }}>
        <DisclaimerBar showAffiliate={false} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  groundingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(234, 229, 220, 0.5)'
  },
  groundingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.routineDone,
    marginRight: spacing.xs + 2
  },
  groundingText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: colors.primary
  },
  messageScroll: {
    flex: 1
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.sm
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-end'
  },
  messageRowUser: {
    justifyContent: 'flex-end'
  },
  messageRowCoach: {
    justifyContent: 'flex-start'
  },
  coachAvatarMini: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs + 2,
    borderWidth: 1,
    borderColor: 'rgba(197, 154, 111, 0.3)',
    marginBottom: 4
  },
  messageBubble: {
    maxWidth: '82%',
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.base,
    borderRadius: radii.lg
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radii.xs,
    ...shadows.subtle
  },
  coachBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.subtle
  },
  userText: {
    color: colors.textInverse,
    fontSize: 14,
    lineHeight: 20
  },
  coachText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end'
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.6)'
  },
  coachTime: {
    color: colors.textTertiary
  },
  chipsContainer: {
    paddingVertical: spacing.xs,
    backgroundColor: colors.background
  },
  chipsScroll: {
    paddingHorizontal: spacing.base
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    marginRight: spacing.sm,
    ...shadows.subtle
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  inputBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.background,
    alignItems: 'center'
  },
  inputField: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    color: colors.textPrimary,
    marginRight: spacing.sm,
    ...shadows.subtle
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle
  },
  sendButtonActive: {
    backgroundColor: colors.gold
  }
});
