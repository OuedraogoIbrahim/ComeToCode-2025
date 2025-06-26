import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import * as SecureStore from "expo-secure-store";
import { Picker } from "@react-native-picker/picker";
import { MaterialIcons } from "@expo/vector-icons";

export default function Accueil() {
  const router = useRouter();

  // État pour les rappels, indicateurs et langue
  const [reminders, setReminders] = useState([
    { id: "1", text: "Prenez votre insuline à 18h", time: "18:00" },
    { id: "2", text: "Mesurez votre tension", time: "08:00" },
  ]);
  const [indicators, setIndicators] = useState([
    { id: "1", type: "Glycémie", value: "120 mg/dL", date: "2025-06-25" },
    { id: "2", type: "Tension", value: "130/80 mmHg", date: "2025-06-25" },
  ]);
  const [language, setLanguage] = useState("fr"); // Langue par défaut : français

  // Charger les données depuis SecureStore (mode hors-ligne)
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedReminders = await SecureStore.getItemAsync("reminders");
        const storedIndicators = await SecureStore.getItemAsync("indicators");
        if (storedReminders) setReminders(JSON.parse(storedReminders));
        if (storedIndicators) setIndicators(JSON.parse(storedIndicators));
      } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
      }
    };
    loadData();
  }, []);

  // Sauvegarder les données dans SecureStore
  useEffect(() => {
    const saveData = async () => {
      try {
        await SecureStore.setItemAsync("reminders", JSON.stringify(reminders));
        await SecureStore.setItemAsync(
          "indicators",
          JSON.stringify(indicators)
        );
      } catch (error) {
        console.error("Erreur lors de la sauvegarde des données :", error);
      }
    };
    saveData();
  }, [reminders, indicators]);

  // Fonction pour lire le contenu à voix haute
  const readContent = async () => {
    const textToRead = `
      Rappels du jour : ${reminders.map((r) => r.text).join(". ")}.
      Derniers indicateurs : ${indicators
        .map((i) => `${i.type} : ${i.value}`)
        .join(". ")}.
    `;
    await Speech.stop(); // Arrêter toute lecture en cours
    Speech.speak(textToRead, {
      language: language === "fr" ? "fr-FR" : "en-US", // Fallback sur anglais pour langues locales
      pitch: 1.0,
      rate: 0.9,
    });
  };

  // Rendu des rappels
  const renderReminder = ({ item }) => (
    <View style={styles.reminderItem}>
      <MaterialIcons name="notifications" size={24} color="#4CAF50" />
      <Text style={styles.reminderText}>
        {item.text} ({item.time})
      </Text>
    </View>
  );

  // Rendu des indicateurs
  const renderIndicator = ({ item }) => (
    <View style={styles.indicatorItem}>
      <MaterialIcons
        name={item.type === "Glycémie" ? "bloodtype" : "favorite"}
        size={24}
        color="#2196F3"
      />
      <Text
        style={styles.indicatorText}
      >{`${item.type}: ${item.value} (${item.date})`}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Yafa Santé</Text>
        <TouchableOpacity onPress={readContent}>
          <MaterialIcons name="volume-up" size={30} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Sélecteur de langue */}
      <View style={styles.languageContainer}>
        <Text style={styles.label}>Langue :</Text>
        <Picker
          selectedValue={language}
          style={styles.picker}
          onValueChange={(itemValue) => setLanguage(itemValue)}
        >
          <Picker.Item label="Français" value="fr" />
          <Picker.Item label="Mooré" value="mo" />
          <Picker.Item label="Dioula" value="di" />
          <Picker.Item label="Fulfuldé" value="fu" />
        </Picker>
      </View>

      {/* Section Rappels */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rappels du jour</Text>
        <FlatList
          data={reminders}
          renderItem={renderReminder}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text>Aucun rappel aujourd'hui</Text>}
        />
      </View>

      {/* Section Indicateurs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Derniers indicateurs</Text>
        <FlatList
          data={indicators}
          renderItem={renderIndicator}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text>Aucun indicateur enregistré</Text>}
        />
      </View>

      {/* Boutons de navigation */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/journal")}
        >
          <MaterialIcons name="book" size={30} color="#fff" />
          <Text style={styles.buttonText}>Journal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/rappels")}
        >
          <MaterialIcons name="alarm" size={30} color="#fff" />
          <Text style={styles.buttonText}>Rappels</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/conseils")}
        >
          <MaterialIcons name="lightbulb" size={30} color="#fff" />
          <Text style={styles.buttonText}>Conseils</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/contact-soignant")}
        >
          <MaterialIcons name="person" size={30} color="#fff" />
          <Text style={styles.buttonText}>Contact</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  languageContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginRight: 10,
    color: "#333",
  },
  picker: {
    flex: 1,
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  reminderItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  reminderText: {
    fontSize: 16,
    marginLeft: 10,
    color: "#333",
  },
  indicatorItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  indicatorText: {
    fontSize: 16,
    marginLeft: 10,
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  button: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    width: "48%",
    marginBottom: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 5,
  },
});
