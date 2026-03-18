# BayadTracker

BayadTracker is a lightweight loan and borrower tracker built with Expo + Expo Router and backed by local SQLite.

Track borrowers, create loans with weekly terms, and mark each week as paid/unpaid or apply partial payments with a custom amount. Loan totals and remaining balances update automatically based on what you record.

## Features

- Borrowers list with search
- Borrower details with loan summary and active loans
- Create loans (principal, interest, duration in weeks)
- Loan details with interactive weekly payments (paid/unpaid/custom + partial payments)
- Local-first storage using `expo-sqlite`

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

## Notes

- Data is stored locally in `bayadtracker.db` using SQLite.
- On Android/iOS, clearing app storage will reset local data.

## Tech

- Expo SDK
- Expo Router (file-based navigation)
- React Native
- SQLite (`expo-sqlite`)
