so they changed there mind so here the full prompt and i want you to make all the pages and everything u can redesign and u can do whatever you see the best and i want a light mode but do it at the end: # 🚗 Car Workshop Work Order System – Full AI Prompt (FINAL)

## 🎯 Project Goal

We are building a **Work Order Tracking System for a car workshop** to fully digitize the workflow from car entry to exit.

The system must:

* Track cars in real-time (Live Dashboard)
* Calculate service time automatically
* Detect delays
* Generate printable technical inspection reports (based on provided PDF template)
* Be scalable for future ERP expansion

---

## 🧩 System Modules

### 1. Customer & Car Entry

Create a form with the following fields:

* Customer Name
* Phone Number (Required)
* Car Brand
* Car Model
* Plate Number
* Engine Size
* Mileage (optional)
* Notes

Button:

👉 Next

---

### 2. Services & Inspection Selection

#### Services (Editable List – from DB or Excel import):

* Engine Oil Change
* Oil Filter
* Air Filter
* AC Filter
* Transmission Oil
* Radiator Water
* Spark Plugs
* Others (dynamic)

#### Inspections:

* OBD Scan
* Brake Check
* Fluid Check
* General Inspection

---

### ⏱️ Time Calculation (CRITICAL)

Each service must have a predefined duration:

Examples:

* Oil Change = 15 min
* Filter = 5 min
* OBD Scan = 10 min

System must:

* Sum all durations
* Generate:

  👉 Estimated Time (in minutes)

---

### 3. Review Page

Display:

* Customer info
* Car info
* Selected services
* Estimated time

Actions:

* Print Technician Copy
* Edit
* Start Work Order

---

### 🖨️ Technician Print (IMPORTANT – PDF Template)

Use the uploaded PDF as a template

System must AUTO-FILL:

#### Header:

* Work Order ID
* Date
* Time
* Customer Name
* Phone
* Car Info (brand, model, engine)
* Plate Number
* Mileage

#### Body (VERY IMPORTANT):

Map services into sections exactly like PDF:

* Engine
* Transmission
* Brakes
* Suspension
* Filters
* Cooling
* Electrical

Each item must have:

* Status (Good / Needs Maintenance / Damaged)
* Technician Notes

#### Footer:

* Technician Name
* Bay Number
* Notes
* Signatures

---

### 4. Start Work Order

On click:

* Save Start Time
* Calculate Expected End Time
* Change status → "In Progress"
* Start Live Timer

---

### 📊 Work Order Status

* New
* In Progress
* Delayed
* Completed
* Cancelled

---

### ⏰ Time Tracking Logic

Each Work Order must track:

* Start Time
* Estimated Time
* Elapsed Time (LIVE)

If:

Elapsed Time > Estimated Time

Then:

* Status → Delayed
* Color → Red
* Optional → Sound Alert

---

### 🧠 Dashboard (LIVE VIEW)

Display all Work Orders as Cards:

Each card shows:

* Work Order ID
* Customer Name
* Car Info
* Services
* Start Time
* Estimated Time
* Elapsed Time
* Status (color coded)
* Bay Number
* Technician

---

### 🎨 Status Colors

* New → Gray
* In Progress → Blue
* Completed → Green
* Delayed → Red
* Cancelled → Dark Gray

---

### 🖥️ Views

#### 1. Grid View

* Cards layout (main dashboard)

#### 2. Detail View

* Full Work Order details

---

### 🔧 Work Order Details Page

Must include:

* Customer & car data
* Services & inspections
* Estimated time
* Live elapsed time
* Delay calculation
* Status

Actions:

* Add Service (during work)
* Change Status
* Assign Technician
* Assign Bay
* Reprint PDF
* Mark as Completed

---

### ➕ Dynamic Service Addition

While work is in progress:

* Add new services
* Automatically update estimated time
* Reflect instantly in UI

---

### ✅ Complete Work Order

On click:

* Save End Time
* Calculate Actual Duration
* Mark if delayed
* Move to Completed List

---

### 📈 Daily Analytics

* Total Work Orders
* Completed
* Delayed
* In Progress
* Average Completion Time
* Fastest Job
* Slowest Job

---

### 🗄️ Database Schema

Table: work_orders

Fields:

* id
* customer_name
* phone
* car_brand
* car_model
* plate
* engine_size
* mileage
* services (JSON)
* inspections (JSON)
* added_services (JSON)
* estimated_duration
* start_time
* end_time
* elapsed_time
* status
* bay_number
* technician
* notes
* created_at

---

### ⚙️ Business Rules

* Work Order cannot start without clicking "Start"
* Timer starts ONLY after start
* Every Work Order must appear in dashboard
* Delay must be calculated automatically
* PDF can be printed anytime
* Services list should support Excel import

---

### 🧠 AI Features (OPTIONAL BUT REQUESTED)

* Suggest services based on car type
* Suggest maintenance intervals
* Smart recommendations based on history

---

### 📦 Future Expansion

* Inventory Management (parts & oils)
* WhatsApp API integration:

  * Welcome message
  * Service reminders
* Multi-branch support

---

## 🚀 Final Goal

Build a system that works like:

👉 Create Work Order → Print → Start → Track Time → Detect Delay → Complete → Analyze

System must be:

* Fast
* Simple UI
* Real-time
* Expandable to full ERP later

---
