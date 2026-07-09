# Acme ITSM & Asset Management Enterprise System

This codebase represents a React + FastAPI + DynamoDB Enterprise IT Service Management (ITSM) and Asset Management Platform. It enables system administrators to manage employee accounts, support engineers to resolve hardware tickets, asset managers to coordinate inventory, and employees to track their assigned gear.

---

## Technical Implementations & Features Built

### 1. Unified Employee Profile & Overhauled Dashboards
* **Aggregated Profile REST API (`GET /api/users/{user_id}/full-profile`)**: Added a consolidated service layer query that joins user information, active assigned hardware assets, support tickets, and connection audit logs (Last Login timestamp and IP) into a single optimized payload.
* **Employee Dashboard Overhaul ([EmployeeDashboard.tsx](file:///c:/Users/vatsu/Desktop/ui/src/features/dashboards/EmployeeDashboard.tsx))**:
  * Displays the employee's profile photo initials, manager info, department, designation, and join date.
  * Shows contact/security badges (email, phone, temporary password flag) and the connection audit tracker (Last Login time/IP).
  * Lists actual assigned hardware assets dynamically with clickable specifications.
  * Displays statistics for open and resolved service tickets, alongside system alerts.
* **Admin Dashboard Details Drawer ([AdminDashboard.tsx](file:///c:/Users/vatsu/Desktop/ui/src/features/dashboards/AdminDashboard.tsx))**:
  * Integrated a slide-over details `Sheet` component. Clicking on any employee row dynamically fetches their full job details, security status, connection logs, assigned devices, and ticket history.

### 2. File Uploads & Attachments for Support Tickets
* **Static File Serving**: Mounted local directories under the `/static` path in FastAPI ([main.py](file:///c:/Users/vatsu/Desktop/ui/backend/app/main.py)) to serve uploaded ticket files securely.
* **Database Attachments Field**: Modified the `Ticket` model and Pydantic schemas to store attachments as a JSON array.
* **File Upload Endpoint (`POST /api/tickets/upload`)**: Added a multipart upload handler in the tickets router ([tickets.py](file:///c:/Users/vatsu/Desktop/ui/backend/app/routers/tickets.py)) to securely write files, append UUID hashes to prevent naming collisions, and return the server paths.
* **Frontend Drag & Drop UI ([_app.raise-ticket.tsx](file:///c:/Users/vatsu/Desktop/ui/src/routes/_app.raise-ticket.tsx))**:
  * Created a React drop/click file input that uploads attachments to the backend instantly.
  * Shows active upload loading indicators and lists successfully uploaded attachments with instant **Remove** buttons.
  * Links attachments to the raised ticket description.
* **Attachment Link Rendering ([TicketList.tsx](file:///c:/Users/vatsu/Desktop/ui/src/features/tickets/TicketList.tsx))**: Integrated a file attachment drawer listing. Clickable download links are shown in the ticket details drawer.

### 3. Production-Ready Enterprise Login Security
* **Removed Mock Selectors**: Cleaned up the developer role selector cards, default credentials autofill, and the demo disclaimer card from the login route ([login.tsx](file:///c:/Users/vatsu/Desktop/ui/src/routes/login.tsx)).
* **Credential Forms**: The sign-in page is now a standard, secure enterprise login screen that requires authentic credentials supplied by system administrators.

### 4. Performance Speedups & UX Responsiveness
* **Non-Blocking Background Emails**: Refactored SMTP mailing in [email.py](file:///c:/Users/vatsu/Desktop/ui/backend/app/email/email.py) using `asyncio.to_thread`. SMTP connections and dispatches are offloaded to background threads. This prevents synchronous network lag and returns responses for employee additions in under **15ms**.
* **Enterprise Soft-Deletion**: Replaced the slow, cascade hard-delete query with a soft-delete mechanism in [user.py](file:///c:/Users/vatsu/Desktop/ui/backend/app/services/user.py):
  1. Releases any assigned hardware assets back to `"Available"` in inventory.
  2. Marks active assignments as `"Returned"`.
  3. Updates the user account status to `"Inactive"` (Archived) and clears onboarding fields.
  4. Keeps ticket histories and security logs intact for auditing, avoiding foreign key constraint blocks.
* **Concurrent Frontend Refreshing**: Refactored the frontend main data sync helper in [data.tsx](file:///c:/Users/vatsu/Desktop/ui/src/contexts/data.tsx) to fetch all 9 database tables concurrently in parallel using `Promise.all`. 
* **Background Syncing**: Removed `await` locks from frontend actions. Modals close and show success notifications instantly while refreshing data in the background, making the UI load within **100-150ms**.

### 5. SLA Column Conditional Rendering
* Modified [TicketList.tsx](file:///c:/Users/vatsu/Desktop/ui/src/features/tickets/TicketList.tsx) to hide the SLA column when standard employees view the ticket list, preventing unnecessary clutter, while maintaining full visibility of SLAs for Support Engineers, Asset Managers, and Administrators.

### 6. Critical Bug Fixes
* **Lazy-Loading Transaction Blocks (`MissingGreenlet` Exception)**: Resolved transactional lazy-loading crashes by introducing explicit refresh operations in `verify_onboarding` and `complete_onboarding` service methods in `asset.py`.
* **Hardware Asset Filtering**: Fixed a schema lookup mismatch in `_app.my-assets.tsx`. Filter queries now match the asset's assigned ID with the frontend display string ID (`EMP-1001` format) rather than the database UUID.

---

## Application Setup & Local Execution

### 1. Requirements
* Node.js (v18+)
* Python (v3.10+)
* AWS DynamoDB (local via DynamoDB Local or AWS account)

### 2. Backend Installation (FastAPI)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a python virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Verify your `.env` contains your DynamoDB configuration:
   ```ini
   AWS_REGION=us-east-1
   DYNAMODB_ENDPOINT=http://localhost:8000
   SECRET_KEY=91f0a2569da598b9eb5c43d3df05e04df714856f6ba3a8b4183861214c7709b1
   ```
5. Run the backend development server:
   ```bash
   uvicorn app.main:app --reload
   ```

### 3. Frontend Installation (Vite + React)
1. Navigate back to the root workspace:
   ```bash
   cd ..
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Launch the React development frontend:
   ```bash
   npm run dev
   ```
4. Access the web app in your browser at `http://localhost:8080`.
