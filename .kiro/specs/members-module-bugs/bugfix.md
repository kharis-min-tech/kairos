# Bugfix Requirements Document

## Introduction

Four distinct bugs affect the members module and admin dashboard of the Kairos admin platform. Two are routing bugs that send users to an error page instead of the correct destination, one is a UI rendering bug where uploaded profile images don't appear immediately, and one is a blank screen regression that occurs after multiple page refreshes. The most critical of these is a data contamination bug where the admin's own email is passed into the members list API after a profile image upload, causing the members page to fetch only the admin's record instead of all members — which then breaks member detail navigation.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an admin clicks "Profile" from the admin user dropdown menu in the dashboard header THEN the system routes to the admin dashboard error page displaying "Failed to load dashboard" instead of the profile page.

1.2 WHEN an admin clicks "Settings" from the admin user dropdown menu in the dashboard header THEN the system routes to the admin dashboard error page displaying "Failed to load dashboard" instead of the settings page.

1.3 WHEN an admin uploads a profile picture for a member on the Member Detail page THEN the system uploads the image successfully but the new profile image does not render on the page immediately — the old placeholder or previous image remains visible until a manual page reload.

1.4 WHEN an admin uploads a profile picture for a member and then navigates back to the members list and clicks on that member's row THEN the system routes to the admin dashboard error page displaying "Failed to load dashboard" instead of the Member Detail page.

1.5 WHEN the members list page loads after an admin has uploaded a profile picture THEN the system sends `GET /v1/members?email={adminEmail}&limit=1` using the admin's email address with a limit of 1, returning only the admin's own record instead of the full paginated members list.

1.6 WHEN a user performs multiple page refreshes on the dashboard THEN the screen goes completely blank — displaying a white empty page with no content, no error message, and no loading indicator.

### Expected Behavior (Correct)

2.1 WHEN an admin clicks "Profile" from the admin user dropdown menu THEN the system SHALL navigate to the admin's profile page without displaying an error.

2.2 WHEN an admin clicks "Settings" from the admin user dropdown menu THEN the system SHALL navigate to the settings page without displaying an error.

2.3 WHEN an admin uploads a profile picture for a member THEN the system SHALL immediately render the new profile image on the Member Detail page without requiring a manual page reload.

2.4 WHEN an admin uploads a profile picture for a member and then clicks on that member's row in the members list THEN the system SHALL navigate to the Member Detail page for that member without displaying an error.

2.5 WHEN the members list page loads THEN the system SHALL send `GET /v1/members` with pagination parameters (limit, offset) and any active filters — it SHALL NOT include the admin's email address or a limit of 1 in the request.

2.6 WHEN a user performs multiple page refreshes on the dashboard THEN the system SHALL CONTINUE TO display the dashboard content correctly without going blank.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a member's profile image already exists and no upload action is taken THEN the system SHALL CONTINUE TO display the existing profile image correctly on the Member Detail page.

3.2 WHEN an admin navigates to the members list without having performed a profile image upload THEN the system SHALL CONTINUE TO fetch and display the full paginated members list correctly.

3.3 WHEN an admin clicks on any member row in the members list under normal conditions THEN the system SHALL CONTINUE TO navigate to the correct Member Detail page for that member.

3.4 WHEN the admin user dropdown menu is opened THEN the system SHALL CONTINUE TO display the Profile and Settings options alongside any other existing menu items.

3.5 WHEN a user navigates directly to the profile or settings page via URL THEN the system SHALL CONTINUE TO load those pages correctly.

3.6 WHEN the dashboard loads on first visit or after a single refresh THEN the system SHALL CONTINUE TO display all dashboard content correctly.
