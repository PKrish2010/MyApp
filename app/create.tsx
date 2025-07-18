import { getColors } from "@/constants/colors";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme
} from "react-native";
import { API_URL } from "../constants/api";

const CATEGORIES = [
  { id: "food", name: "Food & Drinks", icon: "restaurant-outline" },
  { id: "shopping", name: "Shopping", icon: "bag-outline" },
  { id: "transportation", name: "Transportation", icon: "car-outline" },
  { id: "entertainment", name: "Entertainment", icon: "game-controller-outline" },
  { id: "bills", name: "Bills", icon: "receipt-outline" },
  { id: "income", name: "Income", icon: "cash-outline" },
  { id: "other", name: "Other", icon: "ellipsis-horizontal-outline" },
];

const CreateScreen = () => {
  const router = useRouter();
  const { user } = useUser();
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    // Check if user is available
    if (!user) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    // validations
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a transaction title");
      return;
    }
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (!selectedCategory) {
      Alert.alert("Error", "Please select a category");
      return;
    }

    setIsLoading(true);
    try {
      // Format the amount (negative for expenses, positive for income)
      const formattedAmount = isExpense
        ? -Math.abs(parseFloat(amount))
        : Math.abs(parseFloat(amount));

      const response = await fetch(`${API_URL}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          title: title.trim(),
          amount: formattedAmount,
          category: selectedCategory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log('Error response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create transaction`);
      }

      // Clear form on success
      setTitle("");
      setAmount("");
      setSelectedCategory("");
      setIsExpense(true);
      
      Alert.alert("Success", "Transaction created successfully");
      router.back();
    } catch (error) {
      console.error("Error creating transaction:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create transaction";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* HEADER */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b" style={{ borderBottomColor: colors.border }}>
        <TouchableOpacity className="p-2" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold" style={{ color: colors.text }}>New Transaction</Text>
        <TouchableOpacity
          className="flex-row items-center rounded-full px-4 py-2"
          style={{ backgroundColor: isLoading ? colors.border : colors.primary, opacity: isLoading ? 0.6 : 1 }}
          onPress={handleCreate}
          disabled={isLoading}
        >
          <Text className="font-semibold mr-1" style={{ color: colors.white }}>
            {isLoading ? "Saving..." : "Save"}
          </Text>
          {!isLoading && <Ionicons name="checkmark" size={18} color={colors.white} />}
        </TouchableOpacity>
      </View>

      <View className="rounded-2xl m-5 p-5 shadow-md" style={{ backgroundColor: colors.card, shadowColor: colors.shadow }}>
        <View className="flex-row mb-6">
          {/* EXPENSE SELECTOR */}
          <TouchableOpacity
            className="flex-1 flex-row items-center py-3 px-4 rounded-xl mr-2"
            style={{ backgroundColor: isExpense ? colors.expense : colors.background }}
            onPress={() => setIsExpense(true)}
          >
            <Ionicons
              name="arrow-down-circle"
              size={22}
              color={isExpense ? colors.white : colors.expense}
              className="mr-2"
            />
            <Text className="font-semibold" style={{ color: isExpense ? colors.white : colors.expense }}>
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 flex-row items-center py-3 px-4 rounded-xl ml-2"
            style={{ backgroundColor: !isExpense ? colors.income : colors.background }}
            onPress={() => setIsExpense(false)}
          >
            <Ionicons
              name="arrow-up-circle"
              size={22}
              color={!isExpense ? colors.white : colors.income}
              className="mr-2"
            />
            <Text className="font-semibold" style={{ color: !isExpense ? colors.white : colors.income }}>
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* AMOUNT CONTAINER */}
        <View className="flex-row items-center mb-6 px-4 py-3 rounded-xl" style={{ backgroundColor: colors.background }}>
          <Text className="text-2xl font-semibold mr-2" style={{ color: colors.text }}>$</Text>
          <TextInput
            className="flex-1 text-2xl font-semibold"
            style={{ color: colors.text }}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* INPUT CONTAINER */}
        <View style={{ 
          flexDirection: "row", 
          alignItems: "center", 
          marginBottom: 24, 
          paddingHorizontal: 16, 
          paddingVertical: 12, 
          backgroundColor: colors.background, 
          borderRadius: 12 
        }}>
          <Ionicons
            name="create-outline"
            size={22}
            color={colors.textLight}
            style={{ marginRight: 12 }}
          />
          <TextInput
            style={{ 
              flex: 1, 
              fontSize: 16, 
              color: colors.text 
            }}
            placeholder="Transaction Title"
            placeholderTextColor={colors.textLight}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* TITLE */}
        <Text style={{ 
          fontSize: 16, 
          fontWeight: "600", 
          color: colors.text, 
          marginBottom: 16,
          flexDirection: "row",
          alignItems: "center",
        }}>
          <Ionicons name="pricetag-outline" size={16} color={colors.text} style={{ marginRight: 8 }} /> 
          Category
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={{ 
                width: "48%", 
                flexDirection: "row", 
                alignItems: "center", 
                paddingVertical: 12, 
                paddingHorizontal: 16, 
                borderRadius: 12, 
                marginBottom: 12,
                backgroundColor: selectedCategory === category.name ? colors.primary : colors.background,
              }}
              onPress={() => setSelectedCategory(category.name)}
            >
              <Ionicons
                name={category.icon as any}
                size={20}
                color={selectedCategory === category.name ? colors.white : colors.textLight}
                style={{ marginRight: 12 }}
              />
              <Text style={{ 
                fontSize: 14, 
                fontWeight: "500", 
                color: selectedCategory === category.name ? colors.white : colors.text 
              }}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

export default CreateScreen;