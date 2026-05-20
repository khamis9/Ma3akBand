import { useState } from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { C } from '../../src/constants/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();

  const handleSignIn = async () => {
    await signIn(email, password);
  };

  const handleInputChange = () => {
    if (error) clearError();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: 24,
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 36,
              fontWeight: 'bold',
              color: C.text,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            Ma3akBand
          </Text>

          <Text
            style={{
              fontSize: 16,
              color: C.muted,
              textAlign: 'center',
              marginBottom: 40,
            }}
          >
            You are not alone
          </Text>

          <TextInput
            placeholder="Email"
            placeholderTextColor={C.muted}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              handleInputChange();
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{
              backgroundColor: C.card,
              color: C.text,
              borderRadius: 12,
              padding: 14,
              marginBottom: 12,
              fontSize: 16,
            }}
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor={C.muted}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              handleInputChange();
            }}
            secureTextEntry
            style={{
              backgroundColor: C.card,
              color: C.text,
              borderRadius: 12,
              padding: 14,
              marginBottom: 20,
              fontSize: 16,
            }}
          />

          {error && (
            <Text
              style={{
                color: C.danger,
                marginBottom: 16,
                textAlign: 'center',
                fontSize: 14,
              }}
            >
              {error}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleSignIn}
            disabled={isLoading}
            style={{
              backgroundColor: C.accent,
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={C.bg} />
            ) : (
              <Text
                style={{
                  color: C.bg,
                  fontSize: 16,
                  fontWeight: 'bold',
                }}
              >
                Login
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'center' }}>
            <Text style={{ color: C.text, fontSize: 14 }}>
              Don't have an account?{' '}
            </Text>
            <Link href="/(auth)/register">
              <Text style={{ color: C.accent, fontSize: 14, fontWeight: 'bold' }}>
                Register
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
