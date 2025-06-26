import { useRouter } from "expo-router";
import { Button, Text, View } from "react-native";

export default function Index() {
  const nav = useRouter();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>
      <Button onPress={() => nav.push("/accueil")} title="Naviguer" />
    </View>
  );
}
