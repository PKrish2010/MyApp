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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* HEADER */}
      <View style={{ 
        flexDirection: "row", 
        alignItems: "center", 
        justifyContent: "space-between", 
        paddingHorizontal: 20, 
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <TouchableOpacity style={{ padding: 8 }} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text }}>New Transaction</Text>
        <TouchableOpacity
          style={{ 
            flexDirection: "row", 
            alignItems: "center", 
            paddingHorizontal: 16, 
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: isLoading ? colors.border : colors.primary,
            opacity: isLoading ? 0.6 : 1,
          }}
          onPress={handleCreate}
          disabled={isLoading}
        >
          <Text style={{ color: colors.white, fontWeight: "600", marginRight: 4 }}>
            {isLoading ? "Saving..." : "Save"}
          </Text>
          {!isLoading && <Ionicons name="checkmark" size={18} color={colors.white} />}
        </TouchableOpacity>
      </View>

      <View style={{ 
        backgroundColor: colors.card, 
        margin: 20, 
        borderRadius: 16, 
        padding: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        <View style={{ flexDirection: "row", marginBottom: 24 }}>
          {/* EXPENSE SELECTOR */}
          <TouchableOpacity
            style={{ 
              flex: 1, 
              flexDirection: "row", 
              alignItems: "center", 
              justifyContent: "center", 
              paddingVertical: 12, 
              paddingHorizontal: 16, 
              borderRadius: 12, 
              marginRight: 8,
              backgroundColor: isExpense ? colors.expense : colors.background,
            }}
            onPress={() => setIsExpense(true)}
          >
            <Ionicons
              name="arrow-down-circle"
              size={22}
              color={isExpense ? colors.white : colors.expense}
              style={{ marginRight: 8 }}
            />
            <Text style={{ 
              fontWeight: "600", 
              color: isExpense ? colors.white : colors.expense 
            }}>
              Expense
            </Text>
          </TouchableOpacity>

          {/* INCOME SELECTOR */}
          <TouchableOpacity
            style={{ 
              flex: 1, 
              flexDirection: "row", 
              alignItems: "center", 
              justifyContent: "center", 
              paddingVertical: 12, 
              paddingHorizontal: 16, 
              borderRadius: 12, 
              marginLeft: 8,
              backgroundColor: !isExpense ? colors.income : colors.background,
            }}
            onPress={() => setIsExpense(false)}
          >
            <Ionicons
              name="arrow-up-circle"
              size={22}
              color={!isExpense ? colors.white : colors.income}
              style={{ marginRight: 8 }}
            />
            <Text style={{ 
              fontWeight: "600", 
              color: !isExpense ? colors.white : colors.income 
            }}>
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* AMOUNT CONTAINER */}
        <View style={{ 
          flexDirection: "row", 
          alignItems: "center", 
          marginBottom: 24, 
          paddingHorizontal: 16, 
          paddingVertical: 12, 
          backgroundColor: colors.background, 
          borderRadius: 12 
        }}>
          <Text style={{ fontSize: 24, fontWeight: "600", color: colors.text, marginRight: 8 }}>$</Text>
          <TextInput
            style={{ 
              flex: 1, 
              fontSize: 24, 
              fontWeight: "600", 
              color: colors.text 
            }}
            placeholder="0.00"
            placeholderTextColor={colors.textLight}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
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