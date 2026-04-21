# PostgreSQL Installation and Setup Guide for Windows

This guide walks you through installing PostgreSQL on Windows Server/Desktop, creating a database server, and running the Kairos schema initialization scripts.

---

## Step 1: Download PostgreSQL for Windows

1. **Visit the official PostgreSQL download page:**
   - Go to: https://www.postgresql.org/download/windows/
   
2. **Click on "Download the installer"** (provided by EDB)
   - This will take you to: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

3. **Select your version:**
   - **Recommended:** PostgreSQL 18.x (latest stable)
   - Choose Windows x86-64 installer
   - Click the **Download** button

4. **Save the installer:**
   - File will be named something like: `postgresql-18.x-windows-x64.exe`
   - Save to your Downloads folder

---

## Step 2: Install PostgreSQL Server

1. **Run the installer as Administrator:**
   - Right-click the downloaded `.exe` file
   - Select "Run as administrator"

2. **Installation Wizard - Follow these steps:**

   **a) Setup - Welcome Screen**
   - Click **Next**

   **b) Installation Directory**
   - Default: `C:\Program Files\PostgreSQL\18`
   - Click **Next** (or change if needed)

   **c) Select Components** (Keep all selected):
   - ✅ PostgreSQL Server
   - ✅ pgAdmin 4
   - ✅ Stack Builder
   - ✅ Command Line Tools
   - Click **Next**

   **d) Data Directory**
   - Default: `C:\Program Files\PostgreSQL\18\data`
   - Click **Next**

   **e) Password**
   - **IMPORTANT:** Set a password for the PostgreSQL superuser (postgres)
   - **Remember this password!** You'll need it to connect
   - Re-enter password to confirm
   - Example: Use a strong password like `PostgreSQL2026!`
   - Click **Next**

   **f) Port**
   - Default: **5430**
   - Keep this default unless you have a conflict
   - Click **Next**

   **g) Advanced Options (Locale)**
   - Default: [Default locale]
   - Click **Next**

   **h) Pre Installation Summary**
   - Review your settings
   - Click **Next**

3. **Installation Process:**
   - Wait for installation to complete (5-10 minutes)
   - Click **Next** when "Completing the PostgreSQL Setup Wizard" appears

4. **Stack Builder (Optional):**
   - Uncheck "Launch Stack Builder at exit" (not needed now)
   - Click **Finish**

---

## Step 3: Verify PostgreSQL Installation

1. **Open PowerShell as Administrator:**
   - Press `Win + X`
   - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"

2. **Check PostgreSQL service is running:**
   ```powershell
   Get-Service -Name postgresql*
   ```
   
   **Expected output:**
   ```
   Status   Name               DisplayName
   ------   ----               -----------
   Running  postgresql-x64-18  postgresql-x64-18 - PostgreSQL Server 18
   ```

3. **If service is not running, start it:**
   ```powershell
   Start-Service -Name "postgresql-x64-18"
   ```

4. **Add PostgreSQL to System PATH** (if not already added):
   ```powershell
   # Add to current session
   $env:Path += ";C:\Program Files\PostgreSQL\18\bin"
   
   # Add permanently (run in Admin PowerShell)
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\PostgreSQL\18\bin", "Machine")
   ```

5. **Verify psql command:**
   ```powershell
   psql --version
   ```
   
   **Expected output:**
   ```
   psql (PostgreSQL) 18.x
   ```

---

## Step 4: Configure Environment Variables (for Scripts)

Set these environment variables so the scripts can connect without prompting for password:

1. **Open System Environment Variables:**
   - Press `Win + R`
   - Type: `sysdm.cpl` and press Enter
   - Go to "Advanced" tab
   - Click "Environment Variables"

2. **Add PostgreSQL variables** (User variables):
   - Click **New** under "User variables"
   
   **Add these variables:**
   
   | Variable Name | Variable Value | Description |
   |--------------|----------------|-------------|
   | `PGHOST` | `localhost` | Database host |
   | `PGPORT` | `5430` | Database port |
   | `PGUSER` | `postgres` | Database username |
   | `PGPASSWORD` | `YourPassword` | Your PostgreSQL password |

   **Example:**
   - Variable name: `PGHOST`
   - Variable value: `localhost`
   - Click OK
   
   Repeat for all variables.

3. **Click OK** to save and close all dialogs

4. **Restart PowerShell** for changes to take effect

---

## Step 5: Test Connection with psql

1. **Open new PowerShell window:**
   ```powershell
   # Test connection
   psql -U postgres -c "SELECT version();"
   ```

2. **If prompted for password:**
   - Enter the password you set during installation
   - If successful, you'll see PostgreSQL version info

3. **Alternative: Create .pgpass file** (avoids password prompts):
   
   **Create password file:**
   ```powershell
   # Create .pgpass file in your user directory
   $pgpassFile = "$env:APPDATA\postgresql\pgpass.conf"
   $pgpassDir = Split-Path $pgpassFile
   
   # Create directory if it doesn't exist
   if (-not (Test-Path $pgpassDir)) {
       New-Item -ItemType Directory -Path $pgpassDir -Force
   }
   
   # Add connection info (replace YOUR_PASSWORD)
   "localhost:5430:*:postgres:YOUR_PASSWORD" | Out-File -FilePath $pgpassFile -Encoding ASCII
   
   # Set file permissions (hide from other users)
   $acl = Get-Acl $pgpassFile
   $acl.SetAccessRuleProtection($true, $false)
   $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($env:USERNAME, "FullControl", "Allow")
   $acl.AddAccessRule($rule)
   Set-Acl $pgpassFile $acl
   ```

---

## Step 6: Create Kairos Database Using pgAdmin 4

1. **Launch pgAdmin 4:**
   - Press `Win` key
   - Type "pgAdmin 4"
   - Click to open

2. **Set Master Password** (first time only):
   - pgAdmin will ask for a master password
   - This is for pgAdmin only (not PostgreSQL)
   - Set and remember it

3. **Connect to PostgreSQL Server:**
   - In left panel, expand "Servers"
   - Right-click "PostgreSQL 16" (or your version)
   - Click "Connect Server"
   - Enter your PostgreSQL password
   - Check "Save password"
   - Click OK

4. **Create Kairos Database:**
   - Right-click on "Databases"
   - Select "Create" → "Database..."
   
   **Database Dialog:**
   - **General tab:**
     - Database: `kairos`
     - Owner: `postgres`
     - Comment: `Kairos Church Administration System Database`
   
   - **Definition tab** (optional settings):
     - Encoding: `UTF8`
     - Template: `template0`
     - Collation: `English_United Kingdom.1252` (or your locale)
     - Character type: `English_United Kingdom.1252`
   
   - Click **Save**

5. **Verify database creation:**
   - Expand "Databases" in left panel
   - You should see "kairos" database

---

## Step 7: Run Kairos Schema Initialization Script

1. **Open PowerShell as Administrator**

2. **Navigate to the migrations directory:**
   ```powershell
   cd C:\Users\KC Media 2\Kairos\git\kairos\database\migrations
   ```
   
3. **Run the initialization script:**
   ```powershell
   .\init_schema.ps1
   ```
   
   **Or with explicit database name:**
   ```powershell
   .\init_schema.ps1 -DatabaseName kairos
   ```

4. **Follow the prompts:**
   - If database already exists, you'll be asked if you want to drop and recreate it
   - Type `yes` and press Enter to proceed
   - The script will execute all migration files in order

5. **Expected output:**
   ```
   ============================================================================
   Kairos Database Schema Initialization
   ============================================================================
   Database: kairos
   Scripts Directory: C:\...\database\migrations

   [INFO] Running pre-flight checks...
   [OK] PostgreSQL connection verified
   [OK] All required migration scripts found

   ============================================================================
   Database Setup
   ============================================================================
   [INFO] Creating database 'kairos'...
   [OK] Database 'kairos' created

   ============================================================================
   Executing Migration Scripts
   ============================================================================
   [INFO] Executing 01_functions.sql...
   [OK] 01_functions.sql completed successfully
   [INFO] Executing 02_tables.sql...
   [OK] 02_tables.sql completed successfully
   [... more scripts ...]

   ============================================================================
   Verifying Installation
   ============================================================================
   [OK] Table count verified: 29 tables created
   [OK] Function count verified: 1 functions created
   [OK] Trigger count verified: 25 triggers created
   [OK] Foreign key count verified: 63 constraints created
   [OK] Index count verified: 90+ indexes created

   ============================================================================
   Schema Initialization Complete
   ============================================================================
   [OK] All migration scripts executed successfully!

   [INFO] You can now connect to the database:
     psql -d kairos

   [INFO] To verify the schema:
     psql -d kairos -c '\dt dev.*'
   ```

---

## Step 8: Verify Database Schema in pgAdmin

1. **In pgAdmin 4:**
   - Connect to PostgreSQL 18 server (if not already connected)
   - Expand "Databases" → "kairos"
   - Expand "Schemas"

2. **You should see the dev schema with 29 tables:**

   **dev** (29 tables) - All database entities:
   - branches
   - branch_departments
   - branch_leadership
   - departments
   - department_members
   - department_meetings
   - donations
   - events
   - event_notes
   - event_organizers
   - event_registrations
   - fellowships
   - fellowship_members
   - fellowship_meetings
   - fellowship_meeting_attendance
   - follow_ups
   - meeting_attendance
   - members
   - member_roles
   - notifications
   - notification_recipients
   - outreach_programs
   - outreach_participants
   - regions
   - roles
   - services
   - service_attendance
   - souls

3. **Browse data structure:**
   - Expand "dev" schema
   - Expand "Tables"
   - Right-click any table
   - Select "View/Edit Data" → "All Rows"
   - Schema is created but tables are empty (no seed data yet)

---

## Step 9: Connect via Command Line (Optional)

**Connect to kairos database:**
```powershell
psql -d kairos
```

**Once connected, try these commands:**
```sql
-- List all schemas
\dn

-- List all tables in the dev schema
\dt dev.*

-- Describe a table (use schema prefix)
\d dev.members

-- Query a table (use schema prefix)
SELECT * FROM dev.regions;
SELECT * FROM dev.roles;

-- Set search_path to avoid typing schema prefixes
SET search_path TO dev;
SELECT * FROM members;  -- Now works without prefix

-- Exit
\q
```

---

## Troubleshooting

### Issue: psql command not found
**Solution:**
- Add PostgreSQL bin folder to PATH (see Step 3, item 4)
- Restart PowerShell

### Issue: Connection refused or timeout
**Solution:**
- Check service is running: `Get-Service -Name postgresql*`
- Start if needed: `Start-Service -Name "postgresql-x64-18"`
- Verify port: Should be 5430 (check postgresql.conf)

### Issue: Password authentication failed
**Solution:**

If you've forgotten the postgres password or it's not working, you need to reset it:

**Method 1: Reset Password Using pg_hba.conf (Recommended)**

1. **Stop PostgreSQL service:**
   ```powershell
   Stop-Service postgresql-x64-18
   ```

2. **Locate and edit pg_hba.conf:**
   - Open File Explorer and navigate to: `C:\Program Files\PostgreSQL\18\data\`
   - Right-click `pg_hba.conf`
   - Select "Open with" → "Notepad" (Run as Administrator)

3. **Find this line near the bottom:**
   ```
   # IPv4 local connections:
   host    all             all             127.0.0.1/32            scram-sha-256
   ```

4. **Change `scram-sha-256` to `trust`:**
   ```
   # IPv4 local connections:
   host    all             all             127.0.0.1/32            trust
   ```

5. **Also change the IPv6 line:**
   ```
   # IPv6 local connections:
   host    all             all             ::1/128                 trust
   ```

6. **Save the file and close Notepad**

7. **Start PostgreSQL service:**
   ```powershell
   Start-Service postgresql-x64-18
   ```

8. **Connect without password:**
   ```powershell
   psql -U postgres
   ```

9. **Reset the password in psql:**
   ```sql
   ALTER USER postgres WITH PASSWORD 'YourNewPassword123!';
   \q
   ```

10. **Restore security - edit pg_hba.conf again:**
    - Change `trust` back to `scram-sha-256` for both lines
    - Save the file

11. **Restart PostgreSQL:**
    ```powershell
    Restart-Service postgresql-x64-18
    ```

12. **Test with new password:**
    ```powershell
    psql -U postgres -c "SELECT version();"
    # Enter your new password when prompted
    ```

**Method 2: Quick Test (if you remember the password but it's not working)**

- Try connecting without environment variables:
  ```powershell
  # Temporarily clear PGPASSWORD
  $env:PGPASSWORD = $null
  
  # Connect with explicit password prompt
  psql -U postgres -h localhost -p 5430
  # Enter password when prompted
  ```

- Check if password contains special characters that need escaping
- Verify PGPASSWORD environment variable matches actual password

### Issue: Permission denied
**Solution:**
- Run PowerShell as Administrator
- Check user has permissions on database

### Issue: Script execution disabled
**Solution:**
```powershell
# Check execution policy
Get-ExecutionPolicy

# If Restricted, change it (run as Admin)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: Port 5430 already in use
**Solution:**
- Another PostgreSQL instance is running
- Change port during installation (e.g., 5433)
- Or stop the other instance

---

## Next Steps

1. **Load seed data** (if available):
   ```powershell
   .\seed_data.ps1
   ```

2. **Connect your application:**
   - Connection string: `Host=localhost;Port=5430;Database=kairos;Username=postgres;Password=YourPassword`

3. **Backup database:**
   ```powershell
   pg_dump -U postgres -d kairos -f kairos_backup.sql
   ```

4. **Create additional users** (recommended for production):
   ```sql
   -- Connect to kairos database
   psql -d kairos
   
   -- Create application user
   CREATE USER kairos_app WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE kairos TO kairos_app;
   
   -- Grant access to the dev schema
   GRANT USAGE ON SCHEMA dev TO kairos_app;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA dev TO kairos_app;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA dev TO kairos_app;
   
   -- Set default search_path for the user
   ALTER USER kairos_app SET search_path TO dev;
   ```

---

## Quick Reference

| Task | Command |
|------|---------|
| Start PostgreSQL | `Start-Service postgresql-x64-18` |
| Stop PostgreSQL | `Stop-Service postgresql-x64-18` |
| Check status | `Get-Service postgresql*` |
| Connect to database | `psql -d kairos` |
| List databases | `psql -c "\l"` |
| Run SQL file | `psql -d kairos -f script.sql` |
| Create database | `createdb kairos` |
| Drop database | `dropdb kairos` |
| Dump database | `pg_dump -d kairos -f backup.sql` |
| Restore database | `psql -d kairos -f backup.sql` |

---

## Additional Resources

- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **pgAdmin 4 Documentation:** https://www.pgadmin.org/docs/
- **PostgreSQL Windows FAQ:** https://www.postgresql.org/docs/current/install-windows.html
- **PostgreSQL Tutorial:** https://www.postgresqltutorial.com/

---

**Document Version:** 1.2  
**Last Updated:** February 2, 2026  
**PostgreSQL Version:** 18.x  
**Windows Version:** Windows Server 2019/2022, Windows 10/11

---

## Schema Architecture Reference

The Kairos database uses a single `dev` schema for development:

| Schema | Purpose | Tables |
|--------|---------|--------|
| `dev` | All database entities | 29 tables covering regions, branches, members, leadership, roles, departments, fellowships, services, outreach, donations, notifications, events |

**Key table categories:**
- **Core entities:** regions, branches, members, branch_leadership
- **Ministry operations:** roles, member_roles, departments, branch_departments, department_members, department_meetings, meeting_attendance, fellowships, fellowship_members, fellowship_meetings, fellowship_meeting_attendance, services, service_attendance
- **Outreach tracking:** outreach_programs, outreach_participants, souls, follow_ups
- **Financial records:** donations
- **Communications:** notifications, notification_recipients, events, event_organizers, event_notes, event_registrations
