Product Requirements Document (PRD): TiffinTrack
Project Name: TiffinTrack
Platform: Mobile Application (React Native - iOS & Android)
Target Users: Tiffin Service Customers (User App) and Kitchen Owners/Managers (Admin App)
Objective: To build an automated, transparent, and scalable Multi-Tenant SaaS platform that manages daily tiffin deliveries, tracks attendance without disputes, handles sudden cancellations, and automates monthly billing.

1. Core Business Logic (The Rules Engine)
Before diving into features, these three absolute rules govern the entire application's backend architecture:

1. The Validation Rule (Double-Handshake): A meal is only marked as "Billable" (added to the monthly invoice) if Admin_Status == 'Sent' AND User_Status == 'Received'.
2. The Strict Cut-Off Rule (Lock-Out): The system operates on a strict binary pause system to prevent kitchen wastage. If a user pauses before the Admin's global Cut-Off Time, the meal is saved and not billed. Once the Cut-Off Time passes, the meal is locked, dispatched, and billed at 100%. There are no partial cancellation fees.
3. The Auto-Approval Rule (Forgetful User Fallback): If the Admin marks a meal as 'Sent', but the user fails to interact with the app (either to confirm receipt or raise a dispute) within 12 hours of dispatch, a background Cron Job will automatically default the user's status to 'Received'. This guarantees the meal becomes billable and protects the Admin from revenue loss due to inactive users.

2. User Application Requirements (Customer Side)
This interface must be highly intuitive, requiring minimal daily interaction from the user.

1. Smart Onboarding & Profile
Users register via phone/email. They input their full name, precise delivery address, and dietary preferences.

Step 1: Secure Authentication (The Entry): A clean login screen asking for their Mobile Number. The user enters their 10-digit number and receives a 4-to-6 digit OTP via SMS (Powered by Supabase Auth).

Step 1.5: The Handshake (Kitchen Code) - NEW: The screen asks: "Who is cooking your food today?" The user is prompted to enter a 6-character alphanumeric Kitchen Code (e.g., BOMBAY-66) provided by their tiffin service via WhatsApp.

The Logic: The Supabase backend verifies if the code exists in the kitchens table. If valid, it displays a success toast ("Linked to Sharma Tiffin Service!") and permanently attaches the kitchen_id to this user.

Step 2: Essential Details (Who & Where): The user enters their Full Name and Delivery Address (providing a "Use Current Location" button using React Native Geolocation, plus a text box for "Flat No. / Landmark").

Step 3: The "Smart" Preferences (What they eat): User selects Dietary Tags (Veg or Non-Veg) and Subscription Type (Lunch, Dinner, or Both). The app remembers this choice and dynamically hides irrelevant options.

Step 4: Setting the Notification Timers: User sets their expected Lunch/Dinner delivery time via a digital clock picker. They hit "Complete Setup".

2. Multi-Meal Subscription
1. The User Setup: Meal Selection toggles (Lunch Only, Dinner Only, or Both). If "Both" is selected, the UI dynamically calculates and displays a discounted "Combo Price."

2. Granular Meal Pausing: If a user is subscribed to both meals, they can pause them independently. Result: The backend flags only their Lunch as paused for that date; Dinner remains active, and the paused lunch is simply not added to their postpaid ledger.

3. Admin Dispatch Queues: When the Admin selects the "Lunch" filter, the UI populates with Lunch-only subscribers AND Multi-Meal subscribers.

4. Database Architecture: is_lunch_active: true and is_dinner_active: true boolean flags. Every delivery is logged as an individual row in ledger_entries with a specific meal_type.

3. Custom Smart Notifications
Users set an "Expected Arrival Time". A push notification triggers precisely at this time asking: "Has your tiffin arrived?"

4. Two-Way Confirmation
The user interacts with the notification by selecting "Yes" or "No".

Yes: Validates delivery.

No: Opens a prompt requiring a reason (e.g., Late, Missing), alerting the Admin immediately.

5. Strict Pause (Buffer Rule)
To prevent food wastage, the system enforces a strict time-based lock. There are no partial fees; it is a binary system.

State 1: Before Cut-Off (Free Pause): Tapping "Pause Meal" before the cut-off is successful. The meal is not cooked, not dispatched, and not billed.

State 2: After Cut-Off (Order Locked): At the exact cut-off, the UI disables the "Pause" button. It turns gray and reads: "🔒 Preparing in Kitchen". The food is dispatched, and the user is billed (100% charge).

Backend Validation: The backend immediately checks the server's current timestamp against the request to prevent client-device clock manipulation.

6. Vacation Mode
An interactive calendar where users select a date range (Start Date to End Date) to bulk-pause deliveries.

Core Concept: The system completely freezes their subscription for this period. The UI displays a banner: "✈️ On Vacation until April 5th."

Backend Logic: The Dispatch Query fetches all active users WHERE today's date does NOT fall between any start_date and end_date in their vacation_periods array.

Billing: Because it is a Postpaid Ledger, days are skipped, and the cycle invoice only reflects meals actually received.

7. Daily Menu Preview
The Dashboard Card: Displays "Today's Lunch/Dinner" with visual tags (e.g., 🫓 4 Butter Rotis | 🥣 Dal Tadka).

Strict Pause Integration: The "Pause Meal" button sits directly below the preview so users can skip meals they dislike (before cut-off).

Admin Overrides: Admins can set Default Weekly Menus or do Daily Overrides. Editing a menu after a set time triggers a substitution Push Notification.

8. Ledger & In-App Payments
The Dynamic Khata: A 30-Day Postpaid cycle. Every successful delivery adds an entry.

Running Ledger: Dashboard shows live count (e.g., "18 Meals Delivered. Estimated Bill: ₹1,800").

Bill Generation (Day 30): A midnight Cron Job sums UNBILLED meals, creates an Invoice, updates ledger to BILLED, and shows a "Pay Now" button (Razorpay/UPI).

Auto-Lock: If the invoice is UNPAID by Day 33, the backend changes user status to SUSPENDED.

3. Admin Application Requirements (Provider Side)
This interface is an operational dashboard designed for speed, overview, and financial control.

1. User & Rate Management
A master directory of all customers. The Admin sets custom per-meal rates for specific individuals via "Rate Cards".

The Kitchen Code Banner - NEW: At the top of the "Customers" tab, prominently displays the unique code (e.g., Your Code: SHARMA99) with a "Copy to WhatsApp" button for easy sharing.

The Approval Workflow - NEW: Users appear in a "Pending Approvals" list once they use the code. The Admin simply assigns their Rate Tier, Delivery Zone, and clicks "Approve" (no manual data entry required).

Manual Overrides: Admin can apply flat discounts/credits to ledgers.

Backend & Database Architecture (Multi-Tenant Scale):

Table 0: kitchens (The Master Providers)

kitchen_id: UUID (Primary Key)

kitchen_name: String (e.g., "Sharma Tiffin Service")

kitchen_code: String (Unique, e.g., "SHARMA99")

owner_phone: String

Table 1: rate_tiers (id, kitchen_id, tier_name, price_per_meal)

Table 2: delivery_zones (id, kitchen_id, zone_name, daily_delivery_fee)

Table 3: users

user_id: UUID (Primary Key)

kitchen_id: Foreign Key (Links to kitchens)

name: String, phone: String

rate_tier_id: Foreign Key, zone_id: Foreign Key

status: Enum (PENDING, ACTIVE, PAUSED, SUSPENDED)

Security Requirement (Row Level Security): Developer MUST implement Supabase RLS. An Admin's auth token must only allow them to Read/Update/Delete rows where the kitchen_id exactly matches their own to prevent data leaks between competitors.

2. Live Dispatch Dashboard
A real-time counter that automatically deducts users on "Vacation Mode" or who used "Free Pause". It displays the exact prep count: "Cook Today: 45 Lunches, 38 Dinners."

3. "Mark as Sent" & Override
Normal Flow: Admin flips the dispatch toggle. admin_status updates to 'sent'. User gets an "On the way" push notification.

Manual Override: Reserved for resolving active disputes (if a user clicks "No" but Admin has proof). Overriding forcefully changes status to 'received'.

Anti-Fraud Security: Tapping Override bypasses the app and sends a direct Text SMS: "Alert: Admin manually marked tiffin as Delivered. Open app to raise dispute."

4. Live Delivery Tracking (App-Free)
Generating Link: Admin generates a 3-hour temporary web link (e.g., tiffintrack.com/track/route-A) and WhatsApps it to the delivery boy.

The Broadcaster: Delivery boy opens link in Chrome/Safari, allows location. JavaScript (navigator.geolocation) silently pings coordinates to Supabase Realtime every 15s.

The Receiver: Admin views LiveTrackingMap.js where the marker updates in real-time. Link automatically expires.

5. Global Settings Control
Operational Toggles: accepting_new_subscriptions, kitchen_active_today (emergency stop).

Time Rules: lunch_dispatch_time, pause_buffer_hours: 3.

Kitchen-Level Settings - NEW: These are NOT global app settings. Because there are multiple admins, the global_settings table must include kitchen_id so the backend fetches the specific rules for the user's linked kitchen.

Caching Strategy: Settings are fetched on app load from Redis cache/server memory for instant UI adaptation (e.g., Rainstorm locking).

6. Route Optimization
Generates a daily delivery list sorted by area with direct links to Google Maps navigation.

7. Automated Analytics & Billing
The Dunning System: Day 30 invoice generation. Day 32 WhatsApp reminder. Day 35 Auto-Suspend for unpaid bills. Zero human intervention.

Kitchen Forecasting: 7-Day chart calculating: Total Active Users - Users on Vacation - Predicted Pauses to determine raw material purchases.

Business Health: MRR trackers, Customer Churn Rate, and the "Karela Index" (tracking which menus trigger the most pauses).

Aggregation Pipeline: A 2:00 AM Cron Job calculates daily snapshots (revenue, deliveries, pauses) into analytics_snapshots so dashboard charts load instantly without crashing the DB.

4. Proposed Technical Stack
Frontend (Mobile): React Native (Expo/CLI)

Backend as a Service (BaaS): Supabase

Database: PostgreSQL (Relational tables for Users, Subscriptions, Daily Logs).

Authentication: Supabase Auth (OTP via SMS).

Real-time: Supabase Realtime API (Admin Dispatch Dashboard & Map).

Storage: Supabase Storage (Photo proofs).

Push Notifications: Firebase Cloud Messaging (FCM) or Expo Push Notifications.

Location/Maps: Google Maps API (Admin app only).

Payments: Razorpay, or direct UPI Deep-linking.

5. React Native Folder Structure
Plaintext
TiffinTrack/
│
├── src/
│   ├── assets/                 # Images, icons, and custom fonts
│   │
│   ├── components/             # Reusable UI components
│   │   ├── PrimaryButton.js
│   │   ├── StatusBadge.js
│   │   └── TiffinCard.js
│   │
│   ├── context/                # Global State Management
│   │   ├── AuthContext.js      # Manages user session (Supabase Auth)
│   │   └── AppContext.js       # Manages global variables (e.g., current cut-off times)
│   │
│   ├── navigation/             # React Navigation setup
│   │   ├── AppNavigator.js     # Decides whether to show Admin, Customer, or Auth stack
│   │   ├── AdminStack.js       # Admin specific routes
│   │   ├── CustomerStack.js    # Customer specific routes
│   │   └── AuthStack.js        # Login/Signup screens
│   │
│   ├── screens/                # Main UI screens
│   │   ├── Auth/
│   │   │   ├── LoginScreen.js
│   │   │   └── RegisterScreen.js
│   │   │
│   │   ├── Customer/           # User-Facing App
│   │   │   ├── CustomerDashboard.js  # Today's menu and fast actions
│   │   │   ├── MonthlyLedger.js      # Calendar and billing view
│   │   │   └── VacationMode.js       # Calendar for bulk pause
│   │   │
│   │   └── Admin/              # Provider-Facing App
│   │       ├── DispatchDashboard.js  # Live counts and "Mark as Sent" toggles
│   │       ├── UserManagement.js     # List of users to set rates
│   │       └── LiveTrackingMap.js    # Google Maps integration
│   │
│   ├── services/               # API and Database calls
│   │   ├── supabase.js         # Supabase client initialization
│   │   ├── authService.js      # Login/Signup logic
│   │   └── deliveryService.js  # Logic for Double-Handshake & updates
│   │
│   └── utils/                  # Helper functions
│       ├── constants.js        # Colors, API keys
│       └── timeFormatter.js    # Logic for comparing times
│
├── app.json                    # Expo config
├── babel.config.js
└── App.js                      # Root component wrapping contexts & navigators



UI/UX design strategy
https://frown-native-99354313.figma.site this is the link of a figma design of the app I want same design with all the functionality mentioned in the figma design and also in the this file 