Product Requirements Document (PRD): TiffinTrack
Project Name: TiffinTrack
Platform: Mobile Application (React Native - iOS & Android)
Target Users: Tiffin Service Customers (User App) and Kitchen Owners/Managers (Admin App)
Objective: To build an automated, transparent, and scalable system that manages daily tiffin deliveries, tracks attendance without disputes, handles sudden cancellations, and automates monthly billing.

1. Core Business Logic (The Rules Engine)
Before diving into features, these three absolute rules govern the entire application's backend architecture:

The Validation Rule (Double-Handshake): A meal is only marked as "Billable" (added to the monthly invoice) if Admin_Status == 'Sent' AND User_Status == 'Received'.

The Strict Cut-Off Rule (Lock-Out): The system operates on a strict binary pause system to prevent kitchen wastage. If a user pauses before the Admin's global Cut-Off Time, the meal is saved and not billed. Once the Cut-Off Time passes, the meal is locked, dispatched, and billed at 100%. There are no partial cancellation fees.

The Auto-Approval Rule (Forgetful User Fallback): If the Admin marks a meal as 'Sent', but the user fails to interact with the app (either to confirm receipt or raise a dispute) within 12 hours of dispatch, a background Cron Job will automatically default the user's status to 'Received'. This guarantees the meal becomes billable and protects the Admin from revenue loss due to inactive users.

2. User Application Requirements (Customer Side)
This interface must be highly intuitive, requiring minimal daily interaction from the user.

Feature 1: Smart Onboarding & Profile
Users register via phone/email. They input their full name, precise delivery address, and dietary preferences.

Step 1: Secure Authentication: User enters their 10-digit number and receives a 4-to-6 digit OTP via SMS (Powered by Supabase Auth).

Step 2: Essential Details: User provides Full Name and Delivery Address (utilizing a "Use Current Location" button via React Native Geolocation + text box for Flat No).

Step 3: Dietary Preferences: User selects Dietary Tags (Veg/Non-Veg) and Subscription Type (Lunch, Dinner, or Both). The UI dynamically adapts based on these choices.

Step 4: Notification Timers: User sets an "Expected Delivery Time" for their selected meals via a digital clock picker.

Feature 2: Multi-Meal Subscription
Users can toggle their subscription preference: Lunch Only, Dinner Only, or Both.

Combo Pricing: If a user selects both "Lunch" and "Dinner," the frontend can automatically calculate and display a discounted "Combo Price."

Meal-Specific Pausing: If a user receives both Lunch and Dinner, they must have the ability to pause only their Lunch while still receiving their Dinner.

Dynamic Ledger Updates: When the admin triggers the "Bulk Mark Sent" button for a specific meal period, the backend verifies if the user's specific meal is active. If dispatched, exactly 1 meal is added to their running monthly ledger.

Feature 3: Custom Smart Notifications
Users set an "Expected Arrival Time" for each selected meal (e.g., Lunch at 1:30 PM). A push notification triggers precisely at this time asking: "Has your tiffin arrived?"

Feature 4: Two-Way Confirmation
The user interacts with the arrival notification by selecting "Yes" or "No".

Yes: Validates delivery, changing status to 'Received' and making the meal billable.

No: Opens a prompt requiring a reason (e.g., Late, Missing), which alerts the Admin immediately to resolve the dispute.

Feature 5: Strict Cut-Off & Pause Logic (The Buffer Rule)
To prevent food wastage and protect the kitchen's revenue, the system enforces a strict time-based lock on meal cancellations. There are no partial fees; it is a binary system.

The Core Concept: The Admin sets a global "Buffer Time" (e.g., 3 hours before dispatch). If Lunch dispatch is 1:00 PM, the strict cut-off is 10:00 AM.

State 1: Before Cut-Off (Free Pause): If the user taps "Pause Meal" before 10:00 AM, the cancellation is successful. The meal is not cooked, not dispatched, and not billed to the user's monthly ledger. The meal is effectively saved.

State 2: After Cut-Off (Order Locked): At exactly 10:00 AM, the React Native UI automatically disables the "Pause" button for that day's lunch. The button turns gray and changes to: "🔒 Preparing in Kitchen".

No Emergency Cancellations: If the user tries to cancel after the cut-off, the app strictly blocks it. The food will be dispatched, and the user will be billed for the meal (100% charge).

Feature 6: Vacation Mode
An interactive calendar where users select a date range (e.g., Oct 10 to Oct 15) to bulk-pause deliveries.

The Core Concept: While active, no food is cooked, no deliveries are scheduled, and no charges are added to their running monthly Khata (ledger).

The User UI: Once selected, the dashboard displays a large banner: ✈️ "On Vacation until April 5th. Enjoy your trip!" Users can tap "I'm Back Early" to resume.

Dynamic Billing (No Quotas): Because the app uses a Postpaid Ledger, taking a vacation doesn't require extending a rigid 'plan'. The days are simply skipped, and the user's invoice at the end of their 30-day cycle will only reflect the exact number of meals they actually received.

The 24-Hour Notice Rule: A user cannot start a vacation today if the kitchen has already bought groceries. A vacation can only start tomorrow at the earliest.

Feature 7: Daily Menu Preview
A section on the home screen displaying the day's specific menu (updated by Admin) to help users decide whether to consume or cancel that day's meal.

Visual Dashboard Card: Displays the menu as a clean list with emojis (e.g., 🫓 4 Roti | 🥣 Dal).

The "Karela" Integration: The "Pause Meal" button is directly below the menu preview, allowing users to instantly skip meals they do not like, provided they do so before the Cut-Off time.

Admin Overrides & Push Notifications: Admins can set repeating weekly templates or do daily overrides. Updating a menu blasts a notification: "📢 Tomorrow's Lunch Menu is updated!"

Feature 8: Ledger & In-App Payments (The Dynamic Khata)
A 30-Day Postpaid billing cycle that perfectly mimics the traditional Indian "Mahine ka Khata".

The Running Ledger (Days 1–29): The dashboard shows a "Current Month Khata" card with a live count: "18 Meals Delivered. Estimated Bill: ₹1,800."

The Bill Generation (Day 30): A background Cron Job tallies up all 'UNBILLED' meals, generates an invoice, updates the ledger entries to 'BILLED', and changes the UI to a bold Invoice Card with a "Pay Now" button linked to Razorpay/UPI.

The Auto-Lock (Admin Protection): If the invoice remains unpaid after a 3-day grace period, the backend automatically changes the user's status to SUSPENDED, locking them out of the dispatch list until dues are cleared.

3. Admin Application Requirements (Provider Side)
This interface is an operational dashboard designed for speed, overview, and financial control.

Feature 1: User & Rate Management
A master directory of all customers. The Admin can approve new users, edit details, and set custom per-meal rates.

Dynamic Rate Cards: Prices are never hardcoded. Admins create Pricing Tiers (e.g., "Student Veg: ₹80") and Delivery Zones (e.g., "North Campus: +₹10 fee") and assign them to users.

Manual Overrides: Admins can apply manual flat discounts or credits to specific user ledgers.

Feature 2: Live Dispatch Dashboard
A real-time dashboard featuring automated sorting and exact kitchen prep counts.

Filtered Queues: Admins select a meal period (Lunch/Dinner) to generate the dispatch list. The backend automatically removes users on "Vacation Mode" or who paused before the cut-off.

The Prep Counter: Displays exact numbers: "Cook Today: 45 Lunches, 38 Dinners."

Feature 3: "Mark as Sent" & Manual Override
"Mark as Sent" (Normal Flow): Admin toggles a button next to a user's name when the tiffin leaves the kitchen. The database status changes to 'Sent', and the user gets an "Out for Delivery" push notification.

"Manual Override" (Exception Flow): If the user ignores the app, the 12-hour Auto-Approval Cron Job will handle it. However, if there is an active dispute (e.g., User clicked "No"), the Admin can manually force a 'Received' status.

Anti-Fraud Security: The exact second the Admin taps "Manual Override", the system bypasses the app and sends a standard Text SMS to the user: "Alert: Admin manually marked today's tiffin as Delivered. Open the app to raise a dispute within 12 hours."

Feature 4: Live Delivery Tracking (App-Free)
Integrated Google Maps view showing the real-time GPS location of the delivery personnel without requiring a delivery boy app.

The Anonymous Broadcaster: The Admin generates a secure, time-expiring web link from the dashboard and shares it with the delivery boy via WhatsApp.

The Location Ping: The delivery boy opens the link in their mobile browser, grants location permissions, and keeps the screen active. A lightweight script broadcasts their GPS coordinates to Supabase Realtime.

The Admin Map: The Admin app listens to the Supabase channel. LiveTrackingMap.js updates a custom marker on the Google Map in real-time.

Feature 5: Global Settings Control
An Admin interface to configure system-wide variables instantly without app store updates.

Operational Switches: Toggles for accepting_new_subscriptions and kitchen_active_today (to instantly freeze operations during emergencies/rainstorms).

Time Rules: Configurable lunch_dispatch_time and emergency_cancel_buffer_hours.

Caching Strategy: The React Native app fetches these settings on load from a Redis cache/server memory for instant UI adaptation.

Feature 6: Route Optimization
The app generates a daily delivery list sorted by area. Each address features a direct link that opens Google Maps navigation for the delivery boy.

Feature 7: Automated Analytics & Billing
The "Dunning" System: The system handles the collection of money automatically, sending gentle reminders on Day 32, and suspending accounts on Day 35, requiring zero human intervention from the Admin.

Kitchen Forecasting: A 7-day predictive chart (Total Users - Vacations - Predicted Pauses) telling the kitchen exactly how much raw material to purchase.

Business Health Dashboard: Visual charts displaying MRR (Monthly Recurring Revenue), Customer Churn Rate, and the "Karela Index" (tracking which menu items trigger the most pauses).

4. Proposed Technical Stack
Frontend (Mobile): React Native (Expo/CLI)

Backend as a Service (BaaS): Supabase

Database: PostgreSQL (Relational tables for Users, Subscriptions, Menus, Daily Logs, Invoices).

Authentication: Supabase Auth (OTP via SMS).

Real-time: Supabase Realtime API (for Admin Dispatch Dashboard and Live Map Tracking).

Push Notifications: Firebase Cloud Messaging (FCM) or Expo Push Notifications.

Location/Maps: Google Maps API (Admin app only) + Web Geolocation API (Delivery link).

Payments: Razorpay, Cashfree, or direct UPI Deep-linking.



React Native Folder Structure

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
│   │   └── AppContext.js       # Manages global variables (Global Settings)
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
│   │   │   ├── MonthlyLedger.js      # Khata, daily history, and billing view
│   │   │   └── VacationMode.js       # Calendar for bulk pause
│   │   │
│   │   └── Admin/              # Provider-Facing App
│   │       ├── DispatchDashboard.js  # Live counts, route tracking link, Mark as Sent toggles
│   │       ├── UserManagement.js     # List of users to set rates and zones
│   │       └── LiveTrackingMap.js    # Google Maps integration for Web Link tracking
│   │
│   ├── services/               # API and Database calls
│   │   ├── supabase.js         # Supabase client initialization
│   │   ├── authService.js      # Login/Signup logic
│   │   └── deliveryService.js  # Logic for Double-Handshake & updates
│   │
│   └── utils/                  # Helper functions
│       ├── constants.js        # Colors, API keys
│       └── timeFormatter.js    # Logic for comparing times (for the Cut-off rule)
│
├── app.json                    # Expo config
├── babel.config.js
└── App.js                      # Root component wrapping contexts & navigators