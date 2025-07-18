import { useSignUp } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { COLORS } from "../../constants/colors";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  // Handle submission of sign-up form
  const onSignUpPress = async () => {
    if (!isLoaded) return;

    // Start sign-up process using email and password provided
    try {
      await signUp.create({
        emailAddress,
        password,
      });

      // Send user an email with verification code
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      // Set 'pendingVerification' to true to display second form
      // and capture OTP code
      setPendingVerification(true);
    } catch (err: any) {
      if (err.errors?.[0]?.code === "form_identifier_exists") {
        setError("That email address is already in use. Please try another.");
      } else {
        setError("An error occurred. Please try again.");
      }
      console.log(err);
    }
  };

  // Handle submission of verification form
  const onVerifyPress = async () => {
    if (!isLoaded) return;

    try {
      // Use the code the user provided to attempt verification
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      // If verification was completed, set the session to active
      // and redirect the user
      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
        router.replace("/");
      } else {
        // If the status is not complete, check why. User may need to
        // complete further steps.
        console.error(JSON.stringify(signUpAttempt, null, 2));
      }
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2));
    }
  };

  if (pendingVerification) {
    return (
      <View className="flex-1 justify-center items-center px-6 py-8">
        <Text className="text-2xl font-bold my-4 text-center text-[#01579B]">Verify your email</Text>

        {error ? (
          <View className="flex-row items-center bg-red-100 border border-red-400 rounded-lg px-4 py-2 mb-4">
            <Ionicons name="alert-circle" size={20} color={COLORS.expense} />
            <Text className="ml-2 text-red-700 font-semibold flex-1">{error}</Text>
            <TouchableOpacity onPress={() => setError("")}>
              <Ionicons name="close" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        ) : null}

        <TextInput
          className={`w-full rounded-lg px-4 py-3 mb-4 text-base border ${error ? 'border-red-400' : 'border-zinc-200'}`}
          value={code}
          placeholder="Enter your verification code"
          placeholderTextColor="#9A8478"
          onChangeText={(code) => setCode(code)}
        />

        <TouchableOpacity className="w-full bg-blue-700 py-3 rounded-lg items-center mb-4" onPress={onVerifyPress}>
          <Text className="text-white font-semibold text-base">Verify</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
      enableAutomaticScroll={true}
    >
      <View className="flex-1 justify-center items-center px-6 py-8">
        <Image source={require("../../assets/images/revenue-i2.png")} className="w-40 h-40 mb-4" />
        <Text className="text-3xl font-bold my-4 text-center text-[#01579B]">Create Account</Text>

        {error ? (
          <View className="flex-row items-center bg-red-100 border border-red-400 rounded-lg px-4 py-2 mb-4">
            <Ionicons name="alert-circle" size={20} color={COLORS.expense} />
            <Text className="ml-2 text-red-700 font-semibold flex-1">{error}</Text>
            <TouchableOpacity onPress={() => setError("")}>
              <Ionicons name="close" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        ) : null}

        <TextInput
          className={`w-full rounded-lg px-4 py-3 mb-4 text-base border ${error ? 'border-red-400' : 'border-zinc-200'}`}
          autoCapitalize="none"
          value={emailAddress}
          placeholderTextColor="#9A8478"
          placeholder="Enter email"
          onChangeText={(email) => setEmailAddress(email)}
        />

        <TextInput
          className={`w-full rounded-lg px-4 py-3 mb-4 text-base border ${error ? 'border-red-400' : 'border-zinc-200'}`}
          value={password}
          placeholder="Enter password"
          placeholderTextColor="#9A8478"
          secureTextEntry={true}
          onChangeText={(password) => setPassword(password)}
        />

        {pendingVerification && (
          <TextInput
            className={`w-full rounded-lg px-4 py-3 mb-4 text-base border ${error ? 'border-red-400' : 'border-zinc-200'}`}
            value={code}
            placeholder="Enter verification code"
            placeholderTextColor="#9A8478"
            onChangeText={(code) => setCode(code)}
          />
        )}

        <TouchableOpacity className="w-full bg-blue-700 py-3 rounded-lg items-center mb-4" onPress={onSignUpPress}>
          <Text className="text-white font-semibold text-base">Sign Up</Text>
        </TouchableOpacity>

        <View className="flex-row justify-center items-center mt-2">
          <Text className="text-zinc-500">Already have an account?</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-blue-700 font-semibold ml-2">Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}
