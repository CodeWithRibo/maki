import { StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.copy}>Track your mastered cards, streaks, and weekly goals here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B132B',
    paddingHorizontal: 20,
    paddingTop: 64,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 8,
  },
  copy: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 22,
  },
});
