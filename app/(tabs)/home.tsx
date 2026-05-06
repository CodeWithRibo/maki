import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.copy}>Welcome back. Jump into Library to continue your flashcard streak.</Text>
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
