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

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [success, setSuccess] = useState(false);
  const { signUp, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();

  const handleInputChange = () => {
    setValidationError('');
    if (error) clearError();
  };

  const handleSignUp = async () => {
    // Local validation
    if (!email.trim()) {
      setValidationError('Email is required');
      return;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }

    setValidationError('');
    await signUp(email, password);

    // Check if sign up succeeded
    const currentError = useAuthStore.getState().error;
    if (!currentError) {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: C.card,
              borderRadius: 16,
              padding: 24,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 48,
                marginBottom: 16,
              }}
            >
              ✅
            </Text>

            <Text
              style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: C.text,
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              Check your email!
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: C.muted,
                textAlign: 'center',
                marginBottom: 24,
              }}
            >
              Confirm your account then log in.
            </Text>

            <TouchableOpacity
              onPress={() => router.replace('/(auth)/login')}
              style={{
                backgroundColor: C.accent,
                borderRadius: 12,
                paddingHorizontal: 32,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{
                  color: C.bg,
                  fontWeight: 'bold',
                  fontSize: 14,
                }}
              >
                Back to Login
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
              fontSize: 28,
              fontWeight: 'bold',
              color: C.text,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            Create Account
          </Text>

          <Text
            style={{
              fontSize: 16,
              color: C.muted,
              textAlign: 'center',
              marginBottom: 40,
            }}
          >
            Join Ma3akBand
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

          {validationError && (
            <Text
              style={{
                color: C.danger,
                marginBottom: 12,
                textAlign: 'center',
                fontSize: 14,
              }}
            >
              {validationError}
            </Text>
          )}

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
            onPress={handleSignUp}
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
                Register
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'center' }}>
            <Text style={{ color: C.text, fontSize: 14 }}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login">
              <Text style={{ color: C.accent, fontSize: 14, fontWeight: 'bold' }}>
                Login
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
