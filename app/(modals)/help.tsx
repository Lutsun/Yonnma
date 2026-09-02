import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  Colors,
  Fonts,
  Radii,
  Spacing,
  TAB_BAR_HEIGHT,
  TAB_BAR_BOTTOM_MARGIN,
} from '../../constants/theme';

// Pas encore d'assistant conversationnel (IA) — en attendant, une aide
// simple et honnête plutôt qu'un chat qui ne répondrait à rien.
const QUESTIONS: { question: string; answer: string }[] = [
  {
    question: 'Comment trouver un arrêt de bus près de moi ?',
    answer:
      "Sur l'écran d'accueil, active ta position : les arrêts autour de toi s'affichent directement sur la carte. Appuie sur un arrêt pour voir les lignes qui le desservent.",
  },
  {
    question: 'Comment chercher un trajet ?',
    answer:
      "Sur l'écran d'accueil, appuie sur \"Où voulez-vous aller ?\" et indique ta destination.",
  },
  {
    question: 'Quels transports Yonnma couvre-t-il ?',
    answer: 'Le BRT, Dakar Dem Dikk et Tata AFTU pour le moment, avec de vraies lignes et arrêts.',
  },
  {
    question: "Je n'ai pas reçu mon code de connexion, que faire ?",
    answer:
      "Attends 30 secondes puis appuie sur \"Renvoyer\" sur l'écran de vérification. Vérifie aussi que ton numéro est correct.",
  },
];

export default function AssistantScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Besoin d'aide ?</Text>
        <Text style={styles.subtitle}>
          Voici les réponses aux questions les plus fréquentes.
        </Text>

        <View style={{ height: Spacing.lg }} />

        {QUESTIONS.map((item) => (
          <View key={item.question} style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="help-circle" size={20} color={Colors.yonn} />
              <Text style={styles.question}>{item.question}</Text>
            </View>
            <Text style={styles.answer}>{item.answer}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.cream },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_MARGIN + Spacing.xl,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.ma,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.stone,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.stoneLight,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  question: {
    flex: 1,
    fontFamily: Fonts.bodySemi,
    fontSize: 14,
    color: Colors.ma,
  },
  answer: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.stone,
    marginTop: Spacing.xs,
    lineHeight: 19,
  },
});
