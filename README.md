# Ma3akBand - Health Monitoring Mobile App

A React Native Expo mobile app for real-time health monitoring with BLE wearable device connectivity and Supabase backend integration.

## Features

- 🔐 **User Authentication** - Secure login/register with Supabase
- 📊 **Real-time Dashboard** - Live health metrics (BPM, GSR, motion tracking)
- 🤝 **Peer Pairing** - Connect with support partners via invite codes
- 🔔 **Anomaly Alerts** - Instant notifications for health anomalies
- 📱 **BLE Connectivity** - Direct connection to ESP32 wearable bracelet
- ⚙️ **Settings** - Customizable thresholds and notifications
- 🎨 **Dark Purple Theme** - Beautiful, eye-friendly UI

## Tech Stack

- **Frontend**: React Native + Expo SDK 54
- **Navigation**: expo-router v6
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL + Auth)
- **BLE**: react-native-ble-plx
- **Styling**: React Native StyleSheet with custom color constants
- **Environment**: TypeScript

## Project Structure

```
Ma3akBand/
├── app/                          # Expo Router screens
│   ├── (auth)/                   # Authentication screens (protected route)
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── _layout.tsx
│   ├── (app)/                    # Main app screens (protected route)
│   │   ├── dashboard.tsx         # Home screen with health metrics
│   │   ├── pair.tsx              # Pairing & BLE connection
│   │   ├── alerts.tsx            # Anomaly alerts
│   │   ├── settings.tsx          # User settings
│   │   └── _layout.tsx           # Tab navigator
│   ├── _layout.tsx               # Root layout (routing logic)
│   └── index.tsx                 # Entry point
├── src/
│   ├── constants/
│   │   ├── colors.ts             # Unified color palette
│   │   └── thresholds.ts         # Health metric thresholds
│   ├── hooks/
│   │   └── useBLE.ts             # Bluetooth connectivity hook
│   ├── lib/
│   │   └── supabase.ts           # Supabase client setup
│   ├── stores/
│   │   ├── authStore.ts          # Auth state (Zustand)
│   │   └── sensorStore.ts        # Health data state (Zustand)
│   └── types/
│       └── index.ts              # TypeScript interfaces
├── package.json
├── app.json                       # Expo configuration
├── babel.config.js
├── tsconfig.json
└── .env.example                   # Environment variables template
```

## Setup Instructions

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Expo CLI (optional, bundled in project)
- iOS/Android device OR Expo Go app

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/khamis9/Ma3akBand.git
   cd Ma3akBand
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=your-anon-key
   ```

4. **Start development server**
   ```bash
   npx expo start
   ```

### Running on Device

**Option 1: Expo Go (No BLE)**
- Install Expo Go app on your phone
- Scan the QR code from terminal

**Option 2: Development Build (With BLE)**
```bash
eas build --platform android --profile preview
# or
eas build --platform ios --profile preview
```

## Architecture

### Authentication Flow
1. User login/register → Supabase Auth
2. Session stored in secure storage (expo-secure-store)
3. Protected routes check session on app startup
4. Auto-refresh tokens via Supabase

### Sensor Data Flow
1. ESP32 wearable broadcasts BLE characteristics
2. Mobile app subscribes to updates
3. Data parsed from Base64 JSON
4. Zustand store updates in real-time
5. Dashboard renders metrics

### Pairing System
1. Generate 8-character invite code (random)
2. Share with partner
3. Partner enters code → lookup in `pairs` table
4. Create bidirectional pairing relationship
5. Enable cross-user data visibility

## API Integration

### Supabase Tables

**users**
- id (UUID)
- email
- username
- band_name (wearable device name)

**pairs**
- id (UUID)
- invite_code (8 chars)
- user1_id, user2_id (FKs)
- created_at

**sensor_data**
- id (UUID)
- user_id (FK)
- pair_id (FK)
- bpm, gsr, ax, ay, az
- anomaly (boolean)
- recorded_at

**anomaly_alerts**
- id (UUID)
- user_id (FK)
- type ('high_hr', 'low_gsr', 'no_motion')
- severity ('low', 'high')
- timestamp

## BLE Configuration

**Device**: ESP32 Wearable Bracelet
**Service UUID**: `12345678-1234-1234-1234-123456789abc`
**Characteristic UUID**: `abcd1234-ab12-ab12-ab12-abcdef123456`

**Data Format** (JSON over Base64):
```json
{
  "bpm": 75,
  "gsr": 1200,
  "ax": 0.1,
  "ay": 0.2,
  "az": 9.8
}
```

**Update Interval**: 500ms recommended

## Health Metrics

### BPM (Beats Per Minute)
- Normal: 60-100
- High: >120
- Low: <45

### GSR (Galvanic Skin Response)
- Calm: >3000
- Neutral: 2000-3000
- Stressed: 1000-2000
- High Stress: <1000

### Motion
- Still: az deviation <1.5 from 9.8
- Active: otherwise

## Troubleshooting

### BLE not connecting
- Ensure development build (not Expo Go)
- Check ESP32 is broadcasting correct UUIDs
- Verify Bluetooth permissions on device
- Restart both device and app

### Lock file sync issues
```bash
rm package-lock.json
npm install --legacy-peer-deps
git add package-lock.json
git commit -m "chore: resync lock file"
```

### Supabase auth errors
- Check `.env` has correct credentials
- Verify API key permissions in Supabase dashboard
- Ensure email confirmation is enabled if required

## Security Notes

⚠️ **Never commit `.env`** - Always use `.env.example`

Sensitive files excluded from git:
- `.env` (environment variables)
- `node_modules/`
- `.expo/`, `dist/`, etc.
- Build artifacts (`/ios`, `/android`)

## Future Enhancements

- [ ] Machine learning anomaly detection
- [ ] Historical data analytics
- [ ] Push notifications
- [ ] Waveform visualization
- [ ] Data export (PDF/CSV)
- [ ] Multi-language support
- [ ] Accessibility improvements

## License

MIT

## Contact

Developer: Khamis Hussein  
GitHub: [@khamis9](https://github.com/khamis9)
