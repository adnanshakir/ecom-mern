# Fibio: Push Notifications (Flutter side)

## Questions for you first
1. What is the **Android package name** of the app (the `applicationId` in `android/app/build.gradle`, like `com.fibio.app`)? I need it to generate `google-services.json` for you.

## What I'll send you
- `google-services.json`, which goes in `android/app/`. It's from our Firebase project.

## How it works (short version)
- From the admin panel I can send a notification to **all app users at once** (a Firebase "topic"), either immediately or scheduled for later.
- The backend also sends **personal notifications** to one customer's devices. These need that customer's device token saved on my server.
- Each notification has a **title**, an optional **body**, an optional **image**, and a **link** that says which screen to open on tap.

## What you need to build

### 1. Setup
- Packages: `firebase_core`, `firebase_messaging`, `flutter_local_notifications`.
- Initialize Firebase on app start and ask for notification permission (Android 13+ needs the runtime permission).
- Create an Android notification channel with id **`fibio_default`** (importance high).

### 2. Subscribe to broadcasts
- On app start: `FirebaseMessaging.instance.subscribeToTopic('all');`
- The topic name must be exactly `all`. Don't use another name.
- This works for logged-in users and guests alike.

### 3. Save the device token (logged-in users only)
After login, and on every app start while logged in, get the token and send it to my backend with the customer's normal auth token:

```
POST /customer/devices
Body: { "token": "<fcm token>", "platform": "android" }
```
- Also call it again whenever `FirebaseMessaging.instance.onTokenRefresh` fires.
- On **logout**, remove it:
```
DELETE /customer/devices
Body: { "token": "<fcm token>" }
```
- The exact base path depends on how my routes are mounted (it may be `/api/customer/devices`). I'll confirm it with you. Use the same base URL and auth header as your other customer APIs.
- Both endpoints return 400 if the token is missing or empty.

### 4. What a notification looks like
```
notification: { title, body (optional), imageUrl (optional) }
data (all strings): { link, imageUrl }
```
Example: title = "⚡ Flash Sale: 50% off", body = "Only for the next 6 hours.", link = "/products/denim-jacket".

### 5. Showing it
- **App in background or closed:** Android shows it automatically, with the image if there is one. You don't have to do anything.
- **App open (foreground):** Firebase shows nothing by itself. Listen to `FirebaseMessaging.onMessage` and show it with `flutter_local_notifications` using the channel `fibio_default`. If `data['imageUrl']` is set, download and show it too (optional).

### 6. Tap handling
Parse `data['link']` and open the matching screen. Handle all three cases: app in foreground (local notification tap), background (`FirebaseMessaging.onMessageOpenedApp`), and killed (`FirebaseMessaging.instance.getInitialMessage()` on startup).

| link | Open |
|---|---|
| `/` or empty | Home |
| `/products/<slug>` | Product detail |
| `/category/<slug>` | Category / product list |
| `/orders` | My Orders |
| `/orders/<orderId>` | Order detail |

If a link doesn't match anything, just open Home. Never crash on an unknown link.

## Automatic notifications (backend sends them, no admin click)
These go to one customer's saved devices, so the device token must be saved (step 3):
- **Back in stock:** the customer has the product in their wishlist and it returns to stock. Link: `/products/<slug>`.
- **Order shipped** and **order delivered:** includes the order number. Link: `/orders/<orderId>`.

## What I'm handling
- The admin panel (send, schedule, templates, history).
- The scheduler, the Firebase credentials, and the website banner.
- Removing invalid or expired tokens from my database automatically.

## How I'll test with you
1. Install the app, log in, and I'll check that the token appears in my database.
2. I send a broadcast. It should arrive in all three states: foreground, background, and closed.
3. Tap it and confirm the right screen opens.
4. I send one with an image (Android) and check it shows.
5. I mark an order as shipped and check the personal notification arrives.
6. Log out and confirm that customer stops getting personal notifications.

## Not needed right now
- Notification settings or opt-out screens inside the app.

Please tell me the package name and any questions before you start.