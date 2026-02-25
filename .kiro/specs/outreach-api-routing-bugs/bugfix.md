# Bugfix Requirements Document

## Introduction

Multiple API routing issues across the outreach module frontend pages cause 404 errors and broken functionality in the deployed staging environment. The bugs fall into two categories: (A) field name mismatches between the camelCase API responses (from Drizzle ORM) and the snake_case TypeScript entity types used by the frontend, causing `undefined` and `NaN` values to be interpolated into API URLs; and (B) missing or mismatched CDK API Gateway route definitions, causing legitimate endpoints to return 404.

Five distinct but related bugs are affected:
1. "Complete Program" sends `undefined` in URL → 404
2. "Register as Worker" sends `undefined` in URL → 404
3. Program Detail page sends `NaN` as program ID → 404
4. Soul status update sends `NaN` as soul ID → 404
5. Follow-up tracker endpoint returns 404 (route not defined in CDK)

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user clicks "Complete" on a program card on the Outreach Programs page (`/evangelism/outreach`) THEN the system sends `PUT /v1/outreach/programs/undefined/complete` because the frontend accesses `program.outreach_id` (snake_case) but the list API returns `outreachId` (camelCase), resulting in `undefined` being interpolated into the URL and a 404 response.

1.2 WHEN a user clicks "Register as Worker" on a program card on the Outreach Programs page THEN the system sends `POST /v1/outreach/programs/undefined/register-worker` because the frontend accesses `program.outreach_id` (snake_case) but the list API returns `outreachId` (camelCase), resulting in `undefined` being interpolated into the URL and a 404 response.

1.3 WHEN a user clicks on a program card to view details THEN the system navigates to `/evangelism/outreach/detail?id=undefined` (because `program.outreach_id` is `undefined`), and the detail page calls `GET /v1/outreach/programs/NaN` because `Number("undefined")` evaluates to `NaN`, resulting in a 404 response.

1.4 WHEN a user drags a soul card to a new status column on the Soul Tracking Kanban page (`/evangelism/souls`) THEN the system sends `PUT /v1/souls/NaN/status` because the frontend accesses `soul.soul_id` (snake_case) but the list API returns `soulId` (camelCase), resulting in `NaN` being interpolated into the URL and a 404 response.

1.5 WHEN the Follow-Up Tracker page (`/evangelism/followups`) loads THEN the system sends `GET /v1/souls/follow-up-tracker?tab=all` which returns a 404 because no CDK API Gateway route or Lambda handler is defined for this endpoint.

1.6 WHEN the API client calls `outreach.completeProgram(id)` THEN it sends `PUT /v1/outreach/programs/{id}/complete` but no CDK route exists for this path (the CDK stack does not define a route for program completion).

1.7 WHEN the API client calls `outreach.getProgram(id)` THEN it sends `GET /v1/outreach/programs/{id}` but no CDK route exists for this path (the CDK stack does not define a GET route for individual program retrieval, even though the Lambda handler `outreach-get-program.ts` exists).

1.8 WHEN the API client calls `outreach.registerWorker(programId, data)` THEN it sends `POST /v1/outreach/programs/{programId}/register-worker` but the CDK route is defined as `/v1/outreach/programs/{outreachId}/workers` — the path segments do not match, resulting in a 404.

### Expected Behavior (Correct)

2.1 WHEN a user clicks "Complete" on a program card THEN the system SHALL send `PUT /v1/outreach/programs/{outreachId}/complete` with the correct numeric program ID and receive a success response marking the program as completed.

2.2 WHEN a user clicks "Register as Worker" on a program card THEN the system SHALL send `POST /v1/outreach/programs/{outreachId}/register-worker` with the correct numeric program ID and receive a success response registering the current user as a worker.

2.3 WHEN a user clicks on a program card to view details THEN the system SHALL navigate to `/evangelism/outreach/detail?id={outreachId}` with the correct numeric program ID, and the detail page SHALL call `GET /v1/outreach/programs/{outreachId}` and display the program details.

2.4 WHEN a user drags a soul card to a new status column THEN the system SHALL send `PUT /v1/souls/{soulId}/status` with the correct numeric soul ID and receive a success response updating the soul's status.

2.5 WHEN the Follow-Up Tracker page loads THEN the system SHALL send `GET /v1/souls/follow-up-tracker?tab=all` and receive follow-up data including pending count, completed count, and a list of follow-up items.

2.6 WHEN the API client calls `outreach.completeProgram(id)` THEN the CDK API Gateway SHALL have a matching route that invokes the correct Lambda handler to mark the program as completed.

2.7 WHEN the API client calls `outreach.getProgram(id)` THEN the CDK API Gateway SHALL have a matching route that invokes the `outreach-get-program` Lambda handler to return program details.

2.8 WHEN the API client calls `outreach.registerWorker(programId, data)` THEN the CDK route path SHALL match the API client's request path so the request reaches the correct Lambda handler.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the outreach programs list endpoint is called THEN the system SHALL CONTINUE TO return paginated program data with coordinator info, worker count, and souls captured count.

3.2 WHEN a new outreach program is created via the Create Program modal THEN the system SHALL CONTINUE TO successfully create the program and refresh the programs list.

3.3 WHEN the souls list endpoint is called THEN the system SHALL CONTINUE TO return paginated soul data with assigned worker info, program name, and status.

3.4 WHEN a soul is captured via the Capture Soul form THEN the system SHALL CONTINUE TO successfully create the soul record and display it on the Kanban board.

3.5 WHEN a follow-up is logged for a soul via the Soul Detail modal THEN the system SHALL CONTINUE TO successfully create the follow-up record.

3.6 WHEN the Override Branch action is used by an admin THEN the system SHALL CONTINUE TO successfully override the member's branch assignment.

3.7 WHEN existing CDK API routes for other modules (members, branches, departments, fellowships, attendance, donations, forms, notifications, reports) are invoked THEN the system SHALL CONTINUE TO route requests to the correct Lambda handlers without any changes.
