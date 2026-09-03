import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, radii } from '../../src/theme/tokens.js';
import { Card } from '../../src/components/Card.js';
import { DisclaimerBar } from '../../src/components/DisclaimerBar.js';

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
      text: "Hello! I'm your AI Skin Coach. I remember your sensitive skin profile, your current 3-step routine, and your Day 14 progress. How can I help you support your skin today?",
      time: '10:00 AM'
    }
  ]);
  const [inputText, setInputText] = useState<string>('');

  const quickChips = [
    'Can I use this tonight?',
    'My face feels dry today',
    'Make my routine simpler',
    'What changed since last week?'
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

    // Simulate grounded coach reply
    setTimeout(() => {
      let replyText = "Based on your current routine, you're doing great! Keep your focus on gentle moisturization tonight.";
      if (text.toLowerCase().includes('dry')) {
        replyText = "I see! Since you're reporting more dryness today, try applying your moisturizer while your skin is still slightly damp after cleansing, and skip any exfoliating steps tonight.";
      } else if (text.toLowerCase().includes('simpler')) {
        replyText = "Absolutely. We can streamline down to your core essentials: just your gentle cleanser, moisturizer, and daily SPF. Consistency with three core products is plenty.";
      } else if (text.toLowerCase().includes('melanoma') || text.toLowerCase().includes('cancer') || text.toLowerCase().includes('cure')) {
        replyText = "I am a cosmetic skin coach and cannot diagnose or treat medical conditions. If you notice an unusual or rapidly changing spot, please have it evaluated in person by a board-certified dermatologist.";
      }

      const coachMsg: Message = {
        id: `c_${Date.now()}`,
        sender: 'coach',
        text: replyText,
        time: 'Just now'
      };
      setMessages(prev => [...prev, coachMsg]);
    }, 800);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.messageScroll} contentContainerStyle={styles.scrollContent}>
        {/* Context Grounding Header Card */}
        <Card variant="subtle" style={styles.contextCard}>
          <Text style={typography.captionBold}>COACH MEMORY GROUNDING</Text>
          <Text style={[typography.caption, { marginTop: 2 }]}>
            Active routine: 3 steps • Skin profile: Sensitive • Focus: Visible redness
          </Text>
        </Card>

        {messages.map(msg => (
          <View
            key={msg.id}
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
                typography.caption,
                styles.messageTime,
                msg.sender === 'user' && { color: colors.sageLight }
              ]}
            >
              {msg.time}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Quick Prompt Chips */}
      <View style={styles.chipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {quickChips.map((chip, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleSend(chip)}
              style={styles.chip}
            >
              <Text style={styles.chipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask your Skin Coach..."
          placeholderTextColor={colors.textTertiary}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSend()}
        />
        <TouchableOpacity style={styles.sendButton} onPress={() => handleSend()}>
          <Text style={styles.sendButtonText}>↑</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: spacing.base }}>
        <DisclaimerBar showAffiliate={false} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  messageScroll: {
    flex: 1
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: spacing.lg
  },
  contextCard: {
    marginBottom: spacing.base,
    padding: spacing.sm + 2
  },
  messageBubble: {
    maxWidth: '82%',
    padding: spacing.base,
    borderRadius: radii.lg,
    marginBottom: spacing.md
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.sage,
    borderBottomRightRadius: radii.xs
  },
  coachBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  userText: {
    color: colors.textInverse
  },
  coachText: {
    color: colors.textPrimary
  },
  messageTime: {
    fontSize: 10,
    marginTop: spacing.xs,
    alignSelf: 'flex-end'
  },
  chipsContainer: {
    paddingVertical: spacing.xs,
    backgroundColor: colors.background
  },
  chipsScroll: {
    paddingHorizontal: spacing.base
  },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    marginRight: spacing.sm
  },
  chipText: {
    ...typography.captionBold,
    color: colors.textSecondary,
    fontSize: 12
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.base,
    paddingTop: spacing.xs,
    backgroundColor: colors.background,
    alignItems: 'center'
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.textPrimary,
    marginRight: spacing.sm
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendButtonText: {
    color: colors.textInverse,
    fontSize: 20,
    fontWeight: '700'
  }
});
