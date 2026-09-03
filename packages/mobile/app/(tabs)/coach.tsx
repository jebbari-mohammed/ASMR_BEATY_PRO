import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows, gradients } from '../../src/theme/tokens';
import { localImages } from '../../src/theme/images';
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
      text: "Hello! I'm your AI Skin Coach. I have your sensitive skin profile, your 3-step routine, and your Day 12 scan progress in memory. How can I support your skin today?",
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

      {/* Memory Grounding Pill Header with Coach Profile */}
      <View style={styles.coachHeaderCard}>
        <Image source={localImages.coachPortrait} style={styles.coachHeaderAvatar} />
        <View style={styles.coachHeaderDetails}>
          <View style={styles.coachNameRow}>
            <Text style={styles.coachName}>Sarah Jenkins</Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={13} color={colors.goldDark} />
              <Text style={styles.verifiedText}>Aesthetic Director</Text>
            </View>
          </View>
          <Text style={styles.coachSubtext}>
            Grounded in: Sensitive Baseline • 3-Step Routine • Day 12 Scan
          </Text>
        </View>
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
              <Image source={localImages.coachPortrait} style={styles.coachBubbleAvatar} />
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
              style={styles.chipButton}
            >
              <Ionicons name={chip.icon} size={14} color={colors.goldDark} style={styles.chipIcon} />
              <Text style={styles.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Chat Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask your Skin Coach..."
          placeholderTextColor={colors.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={() => handleSend()}
        />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSend()}
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          disabled={!inputText.trim()}
        >
          <Ionicons name="arrow-up" size={18} color={colors.textInverse} />
        </TouchableOpacity>
      </View>

      <DisclaimerBar />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  coachHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 56, 43, 0.08)',
    ...shadows.subtle
  },
  coachHeaderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.goldDark,
    marginRight: spacing.sm + 2
  },
  coachHeaderDetails: {
    flex: 1
  },
  coachNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  coachName: {
    ...typography.title2,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: spacing.xs
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(197, 154, 111, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full
  },
  verifiedText: {
    ...typography.captionBold,
    fontSize: 9,
    color: colors.goldDark,
    marginLeft: 3
  },
  coachSubtext: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary
  },
  messageScroll: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md
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
  coachBubbleAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.goldDark,
    marginRight: spacing.xs,
    marginBottom: 4
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...shadows.subtle
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radii.xs
  },
  coachBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radii.xs,
    borderWidth: 1,
    borderColor: 'rgba(26, 56, 43, 0.08)'
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
    ...typography.caption,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right'
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)'
  },
  coachTime: {
    color: colors.textTertiary
  },
  chipsContainer: {
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 56, 43, 0.06)',
    backgroundColor: colors.background
  },
  chipsScroll: {
    paddingHorizontal: spacing.base
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.full,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(26, 56, 43, 0.1)',
    ...shadows.subtle
  },
  chipIcon: {
    marginRight: 6
  },
  chipText: {
    ...typography.captionBold,
    fontSize: 12,
    color: colors.textPrimary
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(26, 56, 43, 0.12)',
    marginRight: spacing.sm
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle
  },
  sendButtonDisabled: {
    opacity: 0.4
  }
});
