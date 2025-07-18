import { useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from 'expo-router';
import { useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { COLORS } from "../../constants/colors";

export default function Page() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Handle the submission of the sign-in form
  const onSignInPress = async () => {
    if (!isLoaded) return;

    // Start the sign-in process using the email and password provided
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      // If sign-in process is complete, set the created session as active
      // and redirect the user
      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace('/');
      } else {
        // If the status isn't complete, check why. User might need to
        // complete further steps.
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err: any) {
      if (err.errors?.[0]?.code === "form_password_incorrect") {
        setError("Password is incorrect. Please try again.");
      } else {
        setError("An error occurred. Please try again.");
      }
    }
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
      enableOnAndroid={true}
      enableAutomaticScroll={true}
      extraScrollHeight={30}
    >
      <View className="flex-1 justify-center items-center px-6 py-8">
        <Image source={require("../../assets/images/revenue-i4.png")} className="w-40 h-40 mb-4" />
        <Text className="text-3xl font-bold my-4 text-center text-[#01579B]">Welcome Back</Text>
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
          placeholder="Enter email"
          placeholderTextColor="#9A8478"
          onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
        />

        <TextInput
          className={`w-full rounded-lg px-4 py-3 mb-4 text-base border ${error ? 'border-red-400' : 'border-zinc-200'}`}
          value={password}
          placeholder="Enter password"
          placeholderTextColor="#9A8478"
          secureTextEntry={true}
          onChangeText={(password) => setPassword(password)}
        />

        <TouchableOpacity className="w-full bg-blue-700 py-3 rounded-lg items-center mb-4" onPress={onSignInPress}>
          <Text className="text-white font-semibold text-base">Sign In</Text>
        </TouchableOpacity>

        <View className="flex-row justify-center items-center mt-2">
          <Text className="text-zinc-500">Don&apos;t have an account?</Text>

          <Link href={{
            pathname: '/sign-up'
          }} asChild>
            <TouchableOpacity>
              <Text className="text-blue-700 font-semibold ml-2">Sign up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}
