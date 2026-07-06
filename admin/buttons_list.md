# Precision Nav Admin & Vendor Panel - Button Inventory

This document lists all buttons found on every page and layout of the Precision Nav Admin Panel and Vendor Portal. It classifies them by page, describes their purpose, and details their current and proposed functionality.

---

## Summary of Buttons

| Page / Component | Buttons Count | Key Actions |
| :--- | :---: | :--- |
| **1. Dashboard** | 6 | Report Generation, Chart Time Filters, Active Manifest context actions |
| **2. Live Orders** | 7 | Order Filtering, Manual Order Dispatch, Export, Pagination, Floating Action Button |
| **3. Drivers** | 10 | Filtering, Driver Onboarding, Driver View/Deactivate, Pagination, Report Generation |
| **4. Users** | 10 | Filtering, User Addition, User View/Contact/Ban, Pagination |
| **5. Vendors** | 4 | Vendor Addition, Google Place Autocomplete Select, Confirm Save, Vendor Actions |
| **6. Meat Centers** | 4 | Meat Center Addition, Google Place Autocomplete Select, Confirm Save, Center Actions |
| **7. Meat Pricing** | 1 | Save Master Price List |
| **8. Zones** | 15 | Zone Creation, Status/Auto-Surge Toggles, View Map, Delete, Drawing controls, restrictions, Save/Cancel |
| **9. Multi-Stop Orders** | 8 | Filter, Dispatch, Map Route Optimization, Apply/Dismiss Rerouting, Append Stop, Driver Message/Call |
| **10. Payments** | 9 | Filter, CSV Export, Transaction View, Pagination, Analytics Redirect |
| **11. Analytics** | 7 | Date Filtering, PDF Export, Chart Selection Tabs, View All Insights |
| **12. Support** | 11 | Logs Export, Ticket Creation, ticket categorization tabs, Ticket Select, Voice/Actions, Chat tools, Send Message |
| **13. Order Detail** | 4 | Contact Driver, Map Zoom-in/out, Layer Selection |
| **14. Vendor Login** | 10 | OTP Send/Verify, Resend OTP, Reset Password, Login submit, Join Partner link-button |
| **15. Vendor Dashboard** | 7 | View all orders, Manage Menu, Order Details modal view, Call driver, Mark ready, Reject/Accept Schedule |
| **16. Vendor Scheduled Orders** | 2 | Accept/Reject Scheduled Order Requests |
| **17. Vendor Menu** | 7 | Add New Dish, Delete Image, Veg/Non-Veg Toggles, Submit Form, Edit Dish, Delete Dish |
| **18. Vendor Meat Menu** | 4 | In-stock Switch, Edit Price, Confirm Price Save, Cancel Price Edit |
| **19. Vendor Settings** | 4 | Password Visibility Toggles, Change Password Submit |
| **20. AppSidebar** | 1 | Logout (Vendor Portal) |
| **21. TopBar** | 3 | Notifications Bell, City Selector, Sign Out |
| **22. VendorLayout** | 2 | Sign Out, Notifications Bell |
| **Total Buttons Count** | **136** | |

---

## Detailed Page-by-Page Button List

### 1. Dashboard (`/`)
* **Generate Report** (Header) — Triggers operational report export.
* **WEEKLY** (Revenue chart filter) — Switches delivery performance chart time scale to weekly.
* **DAILY** (Revenue chart filter) — Switches delivery performance chart time scale to daily.
* **View All Activity** (Activity log footer) — Navigates/expands the audit logs.
* **Generate Fleet Report** (Fleet optimization card) — Exports detailed driver statistics.
* **MoreVertical Icon (Table Rows)** (Manifest table action) — Accesses contextual actions for an active manifest.

### 2. Live Orders (`/live-orders`)
* **Filter** (Header) — Opens sidebar/popup to filter active orders.
* **Manual Order** (Header) — Initiates form to manually register a new delivery.
* **Download Icon** (Table header) — Downloads active order list as spreadsheet.
* **MoreVertical Icon** (Table header) — Opens general settings for ongoing operations.
* **Previous** (Pagination footer) — Navigates to previous page of orders.
* **Next** (Pagination footer) — Navigates to next page of orders.
* **Plus FAB Icon** (Bottom-right float) — Dispatches a new manual order.

### 3. Drivers (`/drivers`)
* **Filter** (Table header) — Opens driver filtering panel.
* **Onboard New Driver** (Table header) — Opens driver onboarding wizard.
* **Eye Icon (Table Rows)** (Driver action) — Displays driver details, vehicle stats, and active order.
* **PhoneOff Icon (Table Rows)** (Driver action) — Off-duties/deactivates driver registration.
* **ChevronLeft** (Pagination footer) — Previous page of drivers.
* **1** (Pagination footer) — Direct navigation to page 1.
* **2** (Pagination footer) — Direct navigation to page 2.
* **3** (Pagination footer) — Direct navigation to page 3.
* **ChevronRight** (Pagination footer) — Next page of drivers.
* **Generate Fleet Report** (Fleet Optimization Insight Card) — Exports fleet utilization logs.

### 4. Users (`/users`)
* **Filter** (Table header) — Opens user filtering popup.
* **Add User** (Table header) — Opens dialog to manually add user.
* **Eye Icon (Table Rows)** (User action) — Opens details of user (addresses, order history).
* **Mail Icon (Table Rows)** (User action) — Opens quick message/notification modal for the user.
* **Ban Icon (Table Rows)** (User action) — Toggles active block state for user accounts.
* **ChevronLeft** (Pagination footer) — Previous page.
* **1**, **2**, **3** (Pagination footer) — Direct page navigation buttons.
* **ChevronRight** (Pagination footer) — Next page.

### 5. Vendors (`/vendors`)
* **Add Vendor** (Header) — Opens new restaurant vendor onboarding dialog.
* **Google Place Autocomplete Suggestions** (Form) — Clickable options to autofill vendor business name, address, and coordinates.
* **Confirm & Save Vendor** (Form submit) — Dispatches POST request to save new vendor.
* **MoreVertical Icon (Table Rows)** (Vendor action) — Opens contextual options (View Menu, Edit Vendor Details, Delete Vendor).

### 6. Meat Centers (`/meat-centers`)
* **Add Meat Center** (Header) — Opens new meat center onboarding dialog.
* **Google Place Autocomplete Suggestions** (Form) — Clickable options to autofill meat center business name, address, and coordinates.
* **Save Meat Center** (Form submit) — Dispatches POST request to onboard meat center.
* **MoreVertical Icon (Table Rows)** (Center action) — Opens contextual options (View Inventory, Edit Center, Delete Center).

### 7. Meat Pricing (`/meat-pricing`)
* **Save Daily Prices** (Header) — Updates standard daily master prices for meat items globally.

### 8. Zones (`/zones`)
* **Create Zone** (Table header) — Opens dynamic geofence wizard drawer.
* **Live/Disabled Toggle (Table Rows)** (Zone status action) — Instantly switches zone operational geofencing state.
* **Auto/Static Toggle (Table Rows)** (Zone pricing action) — Switches zone between static multipliers and dynamic AI supply-demand pricing.
* **Eye Icon (Table Rows)** (Zone action) — focuses geofence geometry bounds on Google Map canvas.
* **Trash2 Icon (Table Rows)** (Zone action) — Deletes selected geofence record.
* **X Icon** (Modal header) — Closes geofencing editor.
* **Clear coords** (Circular shape editor) — Wipes out currently selected center coordinates.
* **Undo Point** (Polygon shape editor) — Deletes last click coordinate on the map.
* **Clear all** (Polygon shape editor) — Wipes out all points drawn on the map.
* **Advanced Configurations** (Modal body) — Expands restricted timing slot, description, and service constraints.
* **Delivery**, **Pick Up**, **Scheduled** (Modal body) — Toggle buttons restricting allowed service options in this geofence.
* **Cancel** (Modal footer) — Discards zone changes.
* **Save Zone** (Modal footer) — Submits zone geometry coordinates and settings.

### 9. Multi-Stop Orders (`/multi-stop`)
* **Filter Routes** (Header) — Filters list by active driver/route state.
* **Dispatch New Order** (Header) — Dispatches optimized batch multi-stop shipment.
* **Optimize Now** (Map panel overlay) — Solves Traveling Salesperson Problem (TSP) on current coordinates.
* **Apply** (Proposal card) — Implements proposed sequence shift.
* **Dismiss** (Proposal card) — Clears suggested route change.
* **Append Additional Stop** (Stop queue) — Inserts an extra waypoint.
* **Message** (Driver card) — Opens quick communication thread with dispatcher.
* **Voice Call** (Driver card) — Triggers VoIP connection to driver.

### 10. Payments (`/payments`)
* **Filter** (Table header) — Filters transaction records.
* **Export CSV** (Table header) — Exports table data to spreadsheet.
* **Eye Icon (Table Rows)** (Transaction action) — Displays breakdown invoice details.
* **ChevronLeft**, **1**, **2**, **3**, **ChevronRight** (Pagination footer) — Pagination interface.
* **View Analytics** (Fluidity Insight card) — Switches workspace layout to Analytics.

### 11. Analytics (`/analytics`)
* **Last 30 Days** (Header) — Opens calendar picker to adjust metrics range.
* **Export PDF** (Header) — Generates and downloads summary report.
* **W1**, **W2**, **W3**, **W4** (Revenue stream tabs) — Switches metric views across weeks.
* **View All Insights** (Table footer) — Redirects to complete logs.

### 12. Support (`/support`)
* **Export Logs** (Header) — Downloads audit support transcripts.
* **Create Ticket** (Header) — Launches manual complaint drawer.
* **Active Complaints (24)** (Sidebar tab) — Filters conversation queue to active tickets.
* **Recently Resolved (142)** (Sidebar tab) — Filters conversation queue to closed tickets.
* **Ticket item card** (Sidebar list) — Changes active focus chat conversation.
* **Phone Icon** (Chat header) — Voice connects agent to active complaint party.
* **MoreVertical Icon** (Chat header) — Launches case status management (Resolve, Reassign).
* **Paperclip Icon** (Chat toolbox) — Attaches files.
* **Image Icon** (Chat toolbox) — Attaches photos/screenshots.
* **Smile Icon** (Chat toolbox) — Inserts rich emoji text.
* **Send Message** (Chat submit) — Appends message reply to ticket history.

### 13. Order Detail (`/live-orders/:id`)
* **Contact Driver** (Header) — Connects admin operator with delivery driver.
* **Plus Icon** (Map frame overlay) — Zoom in.
* **Minus Icon** (Map frame overlay) — Zoom out.
* **Layers Icon** (Map frame overlay) — Toggles satellite/traffic overlays.

### 14. Vendor Login (`/vendor-login`)
* **Send OTP** (Forgot step 1) — Requests OTP on entered email/phone.
* **Back to login** (Forgot step 1) — Returns to password page.
* **Verify OTP** (Forgot step 2) — Validates OTP token.
* **Back to email** (Forgot step 2) — Resets password recovery path.
* **Resend OTP** (Forgot step 2) — Re-requests OTP dispatch.
* **Reset Password** (Forgot step 3) — Saves new login password.
* **Go to Login** (Forgot step 4) — Navigates to standard login form.
* **Forgot Password?** (Login form) — Toggles forgot password view.
* **Login** (Login form submit) — Validates vendor/admin password details.
* **Join Precision Nav** (Footer link-button) — Redirects registration enquiries.

### 15. Vendor Dashboard (`/vendor/dashboard`)
* **View all** (Recent Orders) — Navigates to vendor order records.
* **Manage Menu** (Menu performance) — Redirects vendor to menu control panel.
* **Order Item row** (Recent Orders list) — Launches modal containing order breakdown.
* **Phone Icon** (Order details modal) — Contacts driver handling this dispatch.
* **Mark as Ready for Pickup** (Order details modal) — Signals preparation is complete.
* **Reject** (Scheduled Delivery overlay) — Declines booking slot request.
* **Accept** (Scheduled Delivery overlay) — Approves booking slot request.

### 16. Vendor Scheduled Orders (`/vendor/scheduled-orders`)
* **Reject** (Pending card actions) — Rejects pre-ordered scheduled slot.
* **Accept** (Pending card actions) — Confirms kitchen slot capability.

### 17. Vendor Menu (`/vendor/menu`)
* **Add New Dish** (Header) — Opens menu item creator.
* **X Icon** (Form image preview) — Deletes selected upload image from server memory.
* **Veg** (Form toggle) — Flags item as vegetarian.
* **Non-Veg** (Form toggle) — Flags item as non-vegetarian.
* **Add Item to Menu** (Form submit) — dispatches item details.
* **Edit2 Icon (Menu Cards)** (Dish action) — Opens dish details editor modal.
* **Trash2 Icon (Menu Cards)** (Dish action) — Removes food item from the menu.

### 18. Vendor Meat Menu (`/vendor/meat-menu`)
* **Availability Switch** (Meat cards) — Toggles inventory stock flags.
* **Check Icon** (Edit mode) — Submits updated price.
* **X Icon** (Edit mode) — Discards price update.
* **Pencil Icon** (Stock price section) — Opens price editing text field.

### 19. Vendor Settings (`/vendor/settings`)
* **Show/Hide current password** — Toggle mask current password field.
* **Show/Hide new password** — Toggle mask new password field.
* **Show/Hide confirm password** — Toggle mask confirm password field.
* **Change Password** (Form submit) — Submits update password request.

### 20. AppSidebar Layout
* **Logout (Vendor Portal)** (Sidebar bottom) — Clears vendor tokens and redirects.

### 21. TopBar Layout
* **Bell Icon** (Navbar right) — Launches notifications alert list.
* **City Selector** (Navbar right) — Opens geofence district switch dropdown.
* **Sign Out** (Navbar right profile) — Clears admin tokens and redirects.

### 22. VendorLayout Layout
* **Sign Out** (Sidebar bottom) — Clears vendor tokens and redirects.
* **Bell Icon** (Header right) — Opens vendor notification drawer.
