This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Apple Sign In

Set `APPLE_BUNDLE_ID` in each backend environment before enabling Sign in with Apple:

- Staging: `com.deqingfan.learnHanZhiIos.staging`
- Production: `com.deqingfan.learnHanZhiIos`

## Apple in-app purchase verification

The iOS app uses the non-consumable product ID `lifetime_pro`. Configure these
server-only variables in Railway for App Store Server API verification:

```text
APPLE_BUNDLE_ID=com.deqingfan.learnHanZhiIos
APPLE_TEAM_ID=<Apple Developer Team ID>
APPLE_SIGN_IN_KEY_ID=<Sign in with Apple key ID>
APPLE_SIGN_IN_PRIVATE_KEY=<contents of the Sign in with Apple .p8 key>
APPLE_APP_ID=<numeric App Store app ID>
APPLE_PRODUCT_ID=lifetime_pro
APPLE_ISSUER_ID=<In-App Purchase issuer ID>
APPLE_KEY_ID=<In-App Purchase key ID>
APPLE_PRIVATE_KEY=<contents of the downloaded .p8 key>
SESSION_TOKEN_SECRET=<at least 32 random characters>
ADMIN_ENABLED=false
ADMIN_API_TOKEN=<at least 32 random characters; required only when admin is enabled>
```

The `APPLE_SIGN_IN_*` key is created under Apple Developer → Certificates,
Identifiers & Profiles → Keys with the Sign in with Apple capability. It is
used to exchange and revoke authorization during account deletion and is
separate from the App Store Connect In-App Purchase key.

`APPLE_PRIVATE_KEY` may contain real line breaks, escaped `\n` characters, or
the base64-encoded contents of the `.p8` file. TestFlight transactions are
looked up in Apple's sandbox after a production lookup returns transaction not
found. Production and sandbox purchases are recorded separately.

Configure App Store Server Notifications V2 in App Store Connect to send both
production and sandbox notifications to:

```text
https://<your-backend-domain>/api/purchases/ios/notifications
```

The iOS target includes the Sign in with Apple entitlement. Also enable the same capability for both App IDs in Apple Developer and regenerate the provisioning profiles before shipping.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
