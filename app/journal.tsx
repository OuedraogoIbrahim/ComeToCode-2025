import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Picker } from "@react-native-picker/picker";
import { MaterialIcons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";

export default function Journal() {
  const router = useRouter();

  // État pour le formulaire
  const [indicatorType, setIndicatorType] = useState("Glycémie");
  const [bloodPressureSystolic, setBloodPressureSystolic] = useState("");
  const [bloodPressureDiastolic, setBloodPressureDiastolic] = useState("");
  const [glucose, setGlucose] = useState("");
  const [weight, setWeight] = useState("");
  const [symptom, setSymptom] = useState("");
  const [glucoseLevel, setGlucoseLevel] = useState("Normale");

  // État pour l'historique des indicateurs
  const [indicators, setIndicators] = useState([]);

  // Charger les données depuis SecureStore
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedIndicators = await SecureStore.getItemAsync("indicators");
        if (storedIndicators) setIndicators(JSON.parse(storedIndicators));
      } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
      }
    };
    loadData();
  }, []);

  // Sauvegarder les données dans SecureStore
  const saveData = async (newIndicator) => {
    try {
      const updatedIndicators = [...indicators, newIndicator];
      await SecureStore.setItemAsync(
        "indicators",
        JSON.stringify(updatedIndicators)
      );
      setIndicators(updatedIndicators);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des données :", error);
    }
  };

  // Vérifier les seuils et générer des alertes
  const checkThresholds = (type, value) => {
    if (type === "Tension") {
      const [systolic, diastolic] = value.split("/").map(Number);
      if (systolic > 140 || diastolic > 90) {
        Alert.alert(
          "Alerte",
          "Votre tension est élevée, contactez votre soignant."
        );
        return true;
      } else if (systolic < 90 || diastolic < 60) {
        Alert.alert(
          "Alerte",
          "Votre tension est basse, contactez votre soignant."
        );
        return true;
      }
    } else if (type === "Glycémie") {
      const glucoseValue = Number(value);
      if (glucoseValue > 180) {
        Alert.alert(
          "Alerte",
          "Votre glycémie est élevée, contactez votre soignant."
        );
        return true;
      } else if (glucoseValue < 70) {
        Alert.alert(
          "Alerte",
          "Votre glycémie est basse, contactez votre soignant."
        );
        return true;
      }
    }
    return false;
  };

  // Enregistrer un nouvel indicateur
  const handleSave = () => {
    const date = new Date().toISOString().split("T")[0]; // Format YYYY-MM-DD
    let value = "";
    let type = indicatorType;

    if (indicatorType === "Tension") {
      value = `${bloodPressureSystolic}/${bloodPressureDiastolic} mmHg`;
    } else if (indicatorType === "Glycémie") {
      value =
        glucoseLevel === "Normale"
          ? "Normale"
          : glucose
          ? `${glucose} mg/dL`
          : glucoseLevel;
    } else if (indicatorType === "Poids") {
      value = `${weight} kg`;
    } else if (indicatorType === "Symptôme") {
      value = symptom;
    }

    if (
      !value ||
      (indicatorType === "Tension" &&
        (!bloodPressureSystolic || !bloodPressureDiastolic))
    ) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    const newIndicator = { id: Date.now().toString(), type, value, date };
    checkThresholds(type, value);
    saveData(newIndicator);

    // Réinitialiser le formulaire
    setBloodPressureSystolic("");
    setBloodPressureDiastolic("");
    setGlucose("");
    setWeight("");
    setSymptom("");
    setGlucoseLevel("Normale");
  };

  // Données pour le graphique (ex. : glycémie sur 7 derniers jours)
  const glucoseData = indicators
    .filter(
      (item) =>
        item.type === "Glycémie" &&
        item.value !== "Normale" &&
        item.value !== "Élevée" &&
        item.value !== "Basse"
    )
    .slice(-7)
    .map((item) => ({
      date: item.date,
      value: parseFloat(item.value) || 0,
    }));

  const chartData = {
    labels: glucoseData.map((item) => item.date.slice(5)), // Format MM-DD
    datasets: [{ data: glucoseData.map((item) => item.value) }],
  };

  return (
    <ScrollView style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Journal des symptômes</Text>
        <TouchableOpacity onPress={() => router.push("/")}>
          <MaterialIcons name="home" size={30} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Sélecteur de type d'indicateur */}
      <View style={styles.section}>
        <Text style={styles.label}>Type indicateur :</Text>
        <Picker
          selectedValue={indicatorType}
          style={styles.picker}
          onValueChange={(itemValue) => setIndicatorType(itemValue)}
        >
          <Picker.Item label="Glycémie" value="Glycémie" />
          <Picker.Item label="Tension" value="Tension" />
          <Picker.Item label="Poids" value="Poids" />
          <Picker.Item label="Symptôme" value="Symptôme" />
        </Picker>
      </View>

      {/* Formulaire selon le type d'indicateur */}
      {indicatorType === "Tension" && (
        <View style={styles.inputContainer}>
          <MaterialIcons
            name="favorite"
            size={24}
            color="#2196F3"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="Tension systolique (ex. : 120)"
            keyboardType="numeric"
            value={bloodPressureSystolic}
            onChangeText={setBloodPressureSystolic}
          />
          <TextInput
            style={styles.input}
            placeholder="Tension diastolique (ex. : 80)"
            keyboardType="numeric"
            value={bloodPressureDiastolic}
            onChangeText={setBloodPressureDiastolic}
          />
        </View>
      )}

      {indicatorType === "Glycémie" && (
        <View style={styles.inputContainer}>
          <MaterialIcons
            name="bloodtype"
            size={24}
            color="#2196F3"
            style={styles.icon}
          />
          <Picker
            selectedValue={glucoseLevel}
            style={styles.picker}
            onValueChange={(itemValue) => setGlucoseLevel(itemValue)}
          >
            <Picker.Item label="Normale" value="Normale" />
            <Picker.Item label="Élevée" value="Élevée" />
            <Picker.Item label="Basse" value="Basse" />
            <Picker.Item label="Valeur précise" value="Précise" />
          </Picker>
          {glucoseLevel === "Précise" && (
            <TextInput
              style={styles.input}
              placeholder="Glycémie (ex. : 120 mg/dL)"
              keyboardType="numeric"
              value={glucose}
              onChangeText={setGlucose}
            />
          )}
        </View>
      )}

      {indicatorType === "Poids" && (
        <View style={styles.inputContainer}>
          <MaterialIcons
            name="fitness-center"
            size={24}
            color="#2196F3"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="Poids (ex. : 70 kg)"
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
          />
        </View>
      )}

      {indicatorType === "Symptôme" && (
        <View style={styles.inputContainer}>
          <MaterialIcons
            name="healing"
            size={24}
            color="#2196F3"
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="Décrivez votre symptôme (ex. : fatigue)"
            value={symptom}
            onChangeText={setSymptom}
          />
        </View>
      )}

      {/* Bouton Enregistrer */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Enregistrer</Text>
      </TouchableOpacity>

      {/* Graphique des glycémies */}
      {glucoseData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Tendance de la glycémie (7 derniers jours)
          </Text>
          <LineChart
            data={chartData}
            width={350}
            height={220}
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "6", strokeWidth: "2", stroke: "#2196F3" },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: "#333",
  },
  picker: {
    height: 50,
    width: "100%",
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
    marginBottom: 10,
  },
  icon: {
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});
