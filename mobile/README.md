# VoicePay mobile app

This Expo app records the payment command and confirmation reply, then sends
the audio to the FastAPI backend. The backend uses Sarvam Saaras for STT. For
a payment preview, the app fetches the Sarvam Bulbul WAV confirmation from the
backend and plays it before recording the user's yes/no response.

## Configure the backend address

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL`:

- Android emulator: `http://10.0.2.2:8000`
- Physical phone: `http://YOUR_COMPUTER_LAN_IP:8000`, for example
  `http://192.168.1.7:8000`

Do not use `127.0.0.1` on a physical phone: it points to the phone itself.
The Sarvam key belongs only in the backend `.env`, never in this mobile app.

## Transaction History

The mobile app includes a dedicated Transaction History screen accessible from the Home screen's **History** button (`/history`).
- **Real-time Synchronization**: Automatically refetches upon screen focus so completed voice payments reflect immediately.
- **Filters**: Filter transactions by `All`, `Sent`, `Received`, or `Failed`.
- **Details Modal**: Tap any transaction card to inspect the full transaction ID, amount, direction, counterparty name & UPI, timestamp, and failure reason.
- **Pagination & Pull-to-Refresh**: Supports pull-down refresh and paginated "Load more" loading.


This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
