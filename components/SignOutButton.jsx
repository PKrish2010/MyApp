import { useClerk } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Alert, TouchableOpacity } from "react-native";

export const SignOutButton = ({ colors }) => {
  // Use `useClerk()` to access the `signOut()` function
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <TouchableOpacity
      className="p-2.5 rounded-full shadow"
      style={{ backgroundColor: colors.card, shadowColor: colors.shadow }}
      onPress={handleSignOut}
    >
      <Ionicons name="log-out-outline" size={20} color={colors.text} />
    </TouchableOpacity>
  );
};
