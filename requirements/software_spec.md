**Kharis Church**

**Membership Application Software Requirements Specification**

# 1\. Introduction

## 1.1 Purpose

This software requirements specification document outlines the key functional and non-functional requirements for the Kharis Church Application (KCA), setting the stage for its design, implementation, and deployment.

This document outlines the requirements for the development of a church application for Kharis Church. The application will provide functionality for managing church members, departments, outreach programs, branches, house group meetings, and security features such as user login, data encryption, and row-level security. The system will also enable the church administration to streamline member information management, program participation, and communication between members.

## 1.2 Scope

The Kharis Church Application (KCA) will be a web-based system that provides the following key functionalities:

\- Membership management

\- Department and outreach program assignments

\- Branch and pastor management

\- House group meeting management

\- Member login and profile management

\- Data security, including encryption and row-level access control

\- Learning Management System

\- Event sign up and Management

\- Financial payment processing

\- Forms and reporting

\- Evangelism Management

\- Inventory and Requisition Management

\- Room Booking System

\- Data and Cybersecurity Module

## 1.3 Intended Audience

This document is intended for:

\- Developers and technical architects responsible for building the application.

\- Stakeholders and decision-makers within Kharis Church who will oversee the application’s development and deployment.

\- System administrators and IT personnel who will manage and maintain the system.

## 1.4 Definitions, Acronyms, and Abbreviations

**Member**: A registered individual who is part of Kharis Church having undergone membership class or actively serving in a department.

**Department**: A specific area or ministry within the church, such as Drama Ministry or Music Department.

**Outreach Program**: An initiative or event organized by the church to reach out to the community or engage in charitable activities such as Jesus Campaign, Singles seminars, Bring a Soul Sunday etc.

**Branch**: A geographical or organizational subdivision of Kharis Church.

**House Group**: A small group of church members who meet regularly for fellowship and study.

**Pastor**: The leader or head of a church branch.

# 2\. Overall Description

## 2.1 Product Perspective

The Kharis Church Application will consist of the following modules:

**Membership Management**: To add, update, and manage member details.

**Department Management**: For assigning members to specific church departments and managing the members of the department

**Outreach Program Management**: To track and manage outreach activities and member participation.

**Branch and Pastor Management**: For managing branches, including assigning pastors and tracking branch-related activities.

**House Group Management**: To manage house groups and their members.

**Security**: Including user authentication, authorization, row-level security, audit log and data encryption.

**Learning Management System:** To organise and manage mandatory learning for church volunteers and leaders.

**Event sign up and Management:** To capture details related to event signs ups which links directly to the outreach system and manage checking into the events.

**Financial Payment Processing:** To facilitate online payments and show member statements in the members module.

**Forms and reporting:** To enhance our data capture with conditional forms and embed Power BI dashboards.

**Evangelism Management:** Manage the capture, management and following up of new souls/contacts.

**Inventory and requisition Management:** To facilitate the managing and maintenance of church equipment across branches including the purchasing and maintenance of equipment.

**Booking System:** To facilitate the booking and management of meeting rooms

**Data and Cybersecurity:** To provide the data protection and cybersecurity teams with appropriate systems and tools to allow them to manage the risk relating to those areas.

## 2.2 User Classes and Characteristics

**Church Administrator**: Responsible for managing all aspects of the system, including member data, departments, outreach programs, and security settings. There would be different tiers of administrators with access to different parts of the application.

**Pastors**: Responsible for managing all aspects of the system limited to their assigned branches, house groups, and members within their branch. Pastors could be given access to other parts of the system if permitted.

**Members**: Should be able log in to view and update their personal information, join departments, and participate in outreach programs. They should also be able to see **only** their giving history and be able to generate reports for HMRC for a given tax year or a specified period.

**System Admin**: Responsible for managing the technical aspects of the system, including user roles, permissions, and database management. If possible, role separation should ensure that systems admins (without express privileges) are not privy to seeing sensitive member information like financials/giving/tithes.  

## 2.3 Operating Environment

\- The system will be a web-based application that runs on modern web browsers (e.g., Chrome, Firefox, Safari).

\- The back end will be built using a relational database management system (e.g., PostgreSQL, MySQL) or a NoSql database if deemed appropriate.

\- The application will be hosted on a cloud platform (e.g., AWS, Azure).

\- The application should be accessible from a supported browser and render correctly on both mobile devices and regular screens.

\- A custom mobile app will also be developed to provide tailored access to the system.

## 2.4 Design and Implementation Constraints

\- The application must comply with data protection regulations (e.g., GDPR, HIPAA) concerning member data.

\- The system should be responsive and mobile-friendly to accommodate users accessing from different devices.

\- Data encryption must be used to secure sensitive member information. The collection, processing and storage of all data should be encrypted both in transit and at rest. Particular attention should be paid to where the data is stored. It should be agreed at the onset in which country or jurisdiction(s) where we allow our data to reside.

# 3\. System Features

## 3.1 Membership Management

**Description**: The system should allow administrators and authorized personnel to add, update, and delete member records

Functional Requirements:

\- Members can register and provide personal information, including name, contact details, birthdate, and gender.

\- Each member is assigned a unique ID.

\- Members can update their personal details (e.g. address, phone number).

\- System should allow the deactivation or deletion of inactive members.

\- Generating of digital ID cards which can be used to register for event/check in for services and in the future grant access to certain parts of the church premises and building.

\- Maintain a record of the members attendance and follow-up (not visible to the member). Having a door entry system activated by a phone touch in will achieve this requirement.

\- Have a category which can be hidden from the system. This will allow a superadmin to be able to hide users who the rest of the users/admins will not need to interact with. - RBAC, separation of duties

\- Private Payment/Donation Tracker

## 3.2 Department Management

**Description**: The system should allow members to join and participate in various church departments or ministries (e.g., Youth, Music, Ushering).

Functional Requirements:

\- Admins can create, update, and delete departments.

\- Members can express interest in joining a department and be assigned based on availability or preferences.

\- Each department has one or more designated leaders (assigned by the admin).

\- Department leaders can view the members assigned to their department.

\- Members can leave or transfer between departments / belong to multiple departments.

\- Workflow tool for managing the recruitment process

\- Ability to capture meeting/service attendance

\- Ability to generate quick attendance reports

\- Ability to capture member follow-up information. For example, date/time of member call and field for notes.

\- Generating reports and alerts on those not followed up

\- Link to the outreach program to allow leaders to track attendance to evangelism efforts easily

\- Keep historical records of who has left the department and when (a date)

## 3.3 Outreach Program Management

**Description**: The system should enable the management of outreach programs that the church organizes for community engagement.

Functional Requirements:

\- Admins can create and manage outreach programs, including program name, description, start/end dates, and location.

\- Members can register for specific outreach programs.

\- Members can view their participation history in outreach programs.

\- Admins can track attendance and participation statistics for each program.

## 3.4 Branch and Pastor Management

**Description**: The system should allow the management of multiple church branches and their associated pastors.

Functional Requirements:

\- Admins can create, update, and delete church branches.

\- Each branch is assigned to a specific pastor, and pastors are linked to their branches.

\- Pastors can view and manage member data within their branch.

\- Pastors can view and manage all modules relating to their branch. Access to financial data should be explicitly granted.

\- Admins can assign pastors to different branches as required.

## 3.5 House Group Management

**Description**: The system should allow the management of house groups within each branch.

Functional Requirements:

\- Admins and pastors can create, update, and delete house groups within their branch.

\- Members can join or leave house groups.

\- House group leaders can view and manage their members.

Notes field to be added for follow up feedback for house group members.(feedback ON or FOR members?)

\- House group meetings can be tracked (e.g., meeting date, topics discussed, attendance).

\- Ability to send a broadcast message/notification to all members of the house group

\- Ability to send a broadcast message/notification to a subset of members

## 3.6 Member Login and Profile Management

**Description**: The system should allow members to log in and update their personal profile and preferences.

Functional Requirements:

\- Members can log in using a username and password.

\- Members can view and update their personal information, including profile picture, contact details, and membership preferences.

\- Members can track their involvement in departments, outreach programs, and house groups.

## 3.7 Security

**Description**: The system must implement row-level security, data encryption, and secure authentication to protect member data.

Functional Requirements:

**Authentication**: Members, pastors, and admins must authenticate using a secure username and password combination.

**Role-based Access Control (RBAC)**: Different user roles (e.g., Admin, Pastor, Member) will have different levels of access to the system. With different access granularity based on the modules.

**Row-level Security**: Access to member data will be restricted based on the user's role and affiliation.

For example:

\- A pastor can only access member data for their assigned branch.

\- A member can only access their own profile.

\- Admins have full access to all data.

**Data Encryption**: All sensitive data (e.g., personal details, passwords) should be encrypted in the database using industry-standard encryption algorithms (e.g., AES-256).

**Secure Communication**: The application should use HTTPS to secure communication between the client and server.

## 3.8 Learning Management System

**Description:** The system should allow the uploading, assigning and tracking of learning material

Functional Requirements

\-Admins should be able to upload, assign and mark training as mandatory based on function and department.

\-The system should allow the ability to upload training material in a user-friendly way including assessments

\- The system should connect to the member module to restrict access when mandatory training has not been completed

\- The system should be linked to the department module to ensure every new member of a department has completed the mandatory training before they can be added to the departments

\-Training reports should be generated by the system including alerts for incomplete/not started trainings.

3.9 Event sign up and Management

**Description:** The system should allow for the sign-up, communication, tracking and check-in of attendees

Functional Requirements

\-Admins should be able to manage all aspects of the system

\-The system should be able to communicate with all sign-ups via text/email

\-The system should allow sign-ups to check in both by scanning a QR code to check-in or manually by admins

\- The system should be able to generate a report on the event sign-ups and attendance. Also, ability to export details of sign-ups

4.0 Financial Payment Processing

**Description:** The system should allow for the capture and management of financial transactions relating to the church

Functional Requirements

\-Easy Capture of payments with links to branches

\-Reporting on payments divided by branches

\-Function for the manual recording of cash payments

4.1 Forms and reporting

**Description:** The system should allow for the capture of data and the feeding of that data into reporting dashboards and metrics.

Functional Requirements

\-Smart forms potentially with AI to ensure conditional questions

\- link to Power BI/ have Power BI quality dashboards

\- Ability to quickly visualise and export data

\- Altar call form (new believers)

\- First time Visitors form

\- Weekly Department Reporting forms

4.2 Evangelism Management

**Description:** The system should allow for the capture and management of souls and contacts won during evangelism, ensuring their assimilation can be monitored and reported on.

Functional Requirements

\-Ability to capture soul/contact information easily via a form

\-Ability to capture and monitor soul follow-up and visitation

\-link to Member management to ensure smooth transition from soul/contact to member

\-Admin ability to view all souls based on leadership level- branch, department, group, internal team (KPI) lead

4.3 Inventory and requisition Management

**Description:** The system should allow for the capture and management of church wide equipment and include a process for requesting equipment.

## Incident Management

Functional Requirements

\-Ability to record, checkout and update the status of equipment

\-A requisition system which includes approval triggers for required stakeholders.

\-Admin ability to view all equipment based on leadership level- branch, department, group

\-Ability to generate requisition and equipment reports

4.4 Booking System

**Description:** The system will allow for the booking of 1 to 1s and rooms based on branch location

Functional Requirements

\-Ability for leaders to book 1 to 1 with member group- limited by location and leadership position

\-Ability to book rooms based on location

\-Admin ability to manage rooms- adding and deleting rooms and managing calendars

\- Transport Booking: Personal pickups/ride sharing and Corporate buses

4.5 Data Protection

**Description:** The system will allow for the Data protection team to manage various aspects of the church and system based on the required regulations

Functional Requirements

*   **Subject Access Request (SAR) support:**Search functionality: ability to search for an individual by name, email address, phone number or other identifier across the system. Search should return all relevant records, including; communications, attendance records, photos/media where tagged etcExport capability: ability to compile and export SAR data in a readable format (PDF or Word)

**Data Breach management:**

*   Automated notification to Data Protection team when a new breach is logged

**Data retention and deletion**

*   Retention schedule management: built in retention rules for different types of data, automated alerts for approaching deadlines, option to flag records for review before deletion
*   Tools for secure deletion or anonymisation, with logs of what was deleted and by whom

**Access controls:**

*   Ability to view access logs to detect unauthorised access to information

**DP training tracker:**

*   Record of church workers who have completed data protection training and reminders/alerts for upcoming or overdue refresher training

**DPIA tool**

*   Pre-built DPIA template that can be filled out and saved online.
*   Ability to assign sections to different team members and enable comments or approvals.

4.6 Cybersecurity

**Description:**

The system will allow for the Cybersecurity team to manage various aspects of the church and system based on the required regulations. The cyber security team will periodically audit the app to ensure adherence to secure principles. This will be done using industry standards as benchmark.

Functional Requirements

The system must follow best practices ensuring security is embedded in every phase of the Software Development Lifecycle. The following requirements should be considered:

*   **Access Control & Authentication**

\-Implement strong authentication

\-Use Secure, role-based access controls

\-Avoid hardcoded credentials or tokens

*   **Encryption**

\-Encryption in transit (TLS 1.2+)

\-Encryption at rest (AES-256)

*   **Input Validation & Output Encoding**

Protect against SQL injection, XSS, etc

*   **Logging and Monitoring**

Maintain logs on significant event (authentication, data access, errors, etc)

*   **Secure APIs**

\-Authenticate and authorise every API request.

\-Validate inputs and ensure output is consistent and safe

*   **Platform & Dependency Security**

\-Regularly update frameworks, libraries and third-party dependencies

\-Avoid unsupported or vulnerable components

*   **Session Management**

\-Use secure, time limited tokens.

\-Invalidate after inactivity sessions on logout or a

*   **Mobile App Considerations**

\-Secure local storage (avoid storing sensitive data on device)

\-Handle permissions carefully (use least privilege principle)

# Departmental Systems

This section of the system will be tailored towards the management of the different departments within the church. A complete management system used for the functioning of the department. Input will be taken from the members of the main system but will be logged in separately or preferably using SSO

Note that there will be the same departments in every branch

Common functional features of each department are

*   Have a public Calander for all members to view events
*   Ability to create departmental events. Calander can only be updated by nominated people in the department
*   Event can be updated to capture names of members that attended the event
*   Ability to expand a Calander event entry and view further details or text and images if applicable
*   Ability to send a broadcast message to all members ofthe department
*   Ability to send a broadcast message to a subset of members
*   Ability to create and manage events including recurring events for the department including member attendance to the event. Eg choir can create recurring ‘rehearsal schedules’. The event should capture the date, venue and the ability to leave an immutable comment by members/attendees
*   All members in a departement can view key contact details for followup calls and Home Visits
*   Ability to write a ‘departmental note’ on a members record. This note should be automatically tagged by the person writing the note.
*   Ability to create dates schedules and assign duties to members for a given schedule/date eg. Who should do what
*   Ability to write a **private** note against departmental member

## Choir

This will be the management system accessible to only the members of the choir and other members of the church if applicable

In addition to the common features, the system should be able to

*   Upload images of all possible uniform combinations for men and women
*   Choose and publish any of this images and associate to a date in the calendar eg . what uniform has been chosen for what Sunday
*   Members can log in and upload audio recordings on their name. These recordings can be played and reviewed by permissioned and nominated individuals. Comments can be left on the audio by both the reviewer and the member.
*   A member can only upload a maximum of 5 audio recordings.
*   Audio recordings can be played by a permissioned individuals
*   The audio will be uploaded with a date/timestamp.
*   Audio comments will be retained for a configurable amount of time set be the admins and viewable privately only by the person who submitted the audio
*   Attendance to rehearsals plus date and venue is captured
*   A one stop music repository for all previous ministrations for reference instead of having to send it via WhatsApp <<-- clarification needed

## Administration

## What are on the admin sheets

## Children's department

*   Creating School classes
*   Teacher of each class

Details of children  
\- name , dob, parents names, allergies

Banner note: this optional note will be highlighted on top of the childs record when its displayed. This can be used to display a ‘need to know’ information about the child. For example ‘Shuna suffers from epilepsy”

*   Sunday school class of child  
    \- Notes (a note can be left on any child’s record by any teacher). These notes should be immutable and timestamped. Notes should only “soft deleted”. Soft deleted notes should be able to be displayed by selecting a check box.
*   Recording of child attendance

## Design

## Posters etc -  
submit design for approval

Repository of designs

Curb file sizes

## Drama

## Hospitality

## Host team

Rota System

Ability to send broadcast messages/emails to members. For examples reminders that they are on duty on a particular date

Upload images of all possible uniform combinations for men and women

Alert members of special events which they may be required to serve at

## Production

## Music

## Follow Up

Safe Guarding

Case management

DBS checks

## New believers

In addition to the common features such as broadcasting messages to all members of the department, the system should permit members to do the following:

View names of new Souls that the member is responsible for

Ability to record follow up’ notes against each member. Date/time of call and any pertinent information.

Alert members when contact has not been made for a set period of time for all assigned souls.

Ability to record completed sessions/ new believers classes

Ability to log notes or updates from mentors to track individual growth and next steps.

Ability for members to access all souls that come through the new believers department as well as any associated notes. This will permit them to complete session feedback and visitation notes.

A function that permits members to refer souls for membership class, k group and baptism.

A function that permits members to pass the details of the souls to their respective branches following branch-wide services/ events such as Faith seminar and Praise night

If the new soul is assigned to another member for mentorship, this should be captured including a date.

Ability to promote to a full member

A ‘raise concern’ function

## Evangelism

## Sanctuary keepers

Rota System

Ability to send broadcast messages/emails to members. For examples reminders that they are on duty on a particular date

## Set-up

## Social Media

## Sound

Inventory management System for equipment.

## Uniform

*   Stock Inventory
*   t-shirts - colour , sizes etc, material for choir
*   Materials for choir
*   Order Management
*   Supplier information
*   CRM – tailors / seamstresses – correspondence
*   Oufit pictures
*   Keep dates and schedule various outfits for the workers of the branch to wear each week most notably for special services.

## Ushers

*   Upload images of all possible uniform combinations for men and women
*   Choose and publish any of this images and associate to a date in the calander eg .what uniform has been chosen for what Sunday

## Welfare

**4.7 Member-to-Member Household Item Exchange Module**

**Description:**  
This module will enable church members to donate or receive used and unwanted household items anonymously within the church community. The system will facilitate a secure and private forum where all members, regardless of branch, can participate in the exchange of items. The goal is to foster generosity, reduce waste, and support members in need.  
  

**Functional Requirements:**  
  

*   Members can anonymously list household items they wish to donate, including item descriptions and optional photos.
*   Members can browse available items posted by others across all branches.
*   The system will facilitate anonymous communication between donor and recipient until the exchange is agreed.
*   Admins can moderate listings to ensure compliance with church guidelines and safety standards.
*   Members can mark items as claimed or remove listings at any time.
*   The system will track the status of each item (available, claimed, removed).
*   Notifications will be sent to members when their item is claimed or when a new item matching their interests is listed.
*   All exchanges are conducted without revealing the identity of the donor or recipient unless both parties agree to disclose.
*   Reporting tools for admins to monitor activity and resolve disputes.
*   The module will be accessible via both the web application and the mobile app.
*   Participation is open to all registered members in all branches.

# 4\. External Interface Requirements

## 4.1 User Interfaces

The application should provide a user-friendly and intuitive web interface. Key screens include:

**Member Registration/Login**: For members to create accounts and log in.

**Member Dashboard**: To manage personal information, departments, outreach programs, and house group participation.

**Admin Dashboard**: For managing departments, outreach programs, branches, and members.

## 4.2 Hardware Interfaces

The system will run on web servers and require no special hardware interfaces beyond standard internet access.

## 4.3 Software Interfaces

The system may integrate with external tools for email notifications, calendar management, or reporting tools (e.g., Google Calendar, SMTP services for email).

## 4.4 Communications Interfaces

The system should communicate securely over HTTPS. Email notifications will be sent to members for important events, updates, or program invitations.

# 5\. Non-Functional Requirements

## 5.1 Performance Requirements

\- The system should support up to 10000 concurrent users.

\- Page load times should be under 3 seconds for the majority of interactions.

## 5.2 Security Requirements

\- See Cyber Security requirements

## 5.3 Availability Requirements

\- The system should have 99% uptime, with scheduled maintenance occurring during off-peak hours.

## 5.4 Backup and Recovery

\- The system should have regular database backups to prevent data loss.

\- In the event of a system failure, data recovery should be possible within 4 hours.