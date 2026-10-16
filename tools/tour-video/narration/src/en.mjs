/**
 * Every clip's script, in English. One entry per flow id.
 *
 * `title` is the bold line of the lower third, `caption` the quiet line under
 * it, and `speech` is what gets spoken — and, through Deepgram's word times,
 * what lights up a word at a time.
 *
 * Section clips are capped at 30 seconds, so a stop's speech wants to be
 * roughly 18–25 words. The aim of each one is that somebody watches it
 * instead of asking for help, which means saying what to do, not what the
 * screen is called.
 */
export default {
  general: [
    ['Your overview', 'The front door, and only what your role covers.', 'This is Kairos. It opens on your overview, and everything you can see here is scoped to what you are actually responsible for.'],
    ['The sidebar', 'Six groups. You only see the ones your role needs.', 'The sidebar is grouped into People, Groups, Gatherings, Insights and Organisation. A section you cannot see is simply one your role has no need of.'],
    ['Members', 'Everybody in one list, with their status on the row.', 'Members is the directory. Everybody in the church is here, with their home branch and whether they have completed the membership class.'],
    ['Fellowships', 'Small groups, with a map so people can find one.', 'Fellowships are the small groups. K-Groups, Kharis Express, New Breeds and the rest, with a map so somebody can find the one nearest them.'],
    ['Departments', 'Ministry teams, their rotas and their recruitment.', 'Departments are the ministry teams. Each one keeps its own roster, its serving rota and the people applying to join it.'],
    ['Attendance', 'Services, check-in, and the weekly registers.', 'Attendance covers services and check-in. People can check themselves in with a QR code, or the desk can record them on arrival.'],
    ['The souls pipeline', 'From first contact through to a department.', 'The souls pipeline follows somebody reached through evangelism: new, following up, interested, converted, and on into discipleship.'],
    ['Reports', 'Attendance, growth and engagement, scoped to you.', 'Reports turn all of that into numbers. Attendance trends, membership growth and engagement, again only across what your role covers.'],
    ['Your language', 'Kairos and this handbook, in four languages.', 'Kairos speaks English, French, Krio and Twi. Change it from the sidebar, and the handbook opens in the same language you chose.'],
  ],
  // The administrator tour walks the same ground as the general one; the
  // difference is the account it is recorded under, not the words.
  admin: [
    ['Your overview', 'The front door, and only what your role covers.', 'This is Kairos. It opens on your overview, and everything you can see here is scoped to what you are actually responsible for.'],
    ['The sidebar', 'Six groups. You only see the ones your role needs.', 'The sidebar is grouped into People, Groups, Gatherings, Insights and Organisation. A section you cannot see is simply one your role has no need of.'],
    ['Members', 'Everybody in one list, with their status on the row.', 'Members is the directory. Everybody in the church is here, with their home branch and whether they have completed the membership class.'],
    ['Fellowships', 'Small groups, with a map so people can find one.', 'Fellowships are the small groups. K-Groups, Kharis Express, New Breeds and the rest, with a map so somebody can find the one nearest them.'],
    ['Departments', 'Ministry teams, their rotas and their recruitment.', 'Departments are the ministry teams. Each one keeps its own roster, its serving rota and the people applying to join it.'],
    ['Attendance', 'Services, check-in, and the weekly registers.', 'Attendance covers services and check-in. People can check themselves in with a QR code, or the desk can record them on arrival.'],
    ['The souls pipeline', 'From first contact through to a department.', 'The souls pipeline follows somebody reached through evangelism: new, following up, interested, converted, and on into discipleship.'],
    ['Reports', 'Attendance, growth and engagement, scoped to you.', 'Reports turn all of that into numbers. Attendance trends, membership growth and engagement, again only across what your role covers.'],
    ['Your language', 'Kairos and this handbook, in four languages.', 'Kairos speaks English, French, Krio and Twi. Change it from the sidebar, and the handbook opens in the same language you chose.'],
  ],
  member: [
    ['Your overview', 'Only what belongs to you.', 'This is your overview. Everything here is yours: your groups, your attendance, and whatever the church needs from you this week.'],
    ['What you can see', 'A short sidebar is not a missing feature.', 'Your sidebar is short because most of Kairos is not yours to run. Nothing is hidden from you out of secrecy.'],
    ['Your attendance', 'Every service you have been marked at.', 'My Attendance shows every service you were recorded at, your current streak, and how your attendance looks over the last few weeks.'],
    ['Your fellowship', 'The small group you belong to.', 'Fellowships shows the group you belong to, when it meets and where. If you are not in one yet, the map will find you the nearest.'],
    ['Your departments', 'The teams you serve on.', 'Departments lists the teams you serve on, when you are next on the rota, and the uniform for that service if there is one.'],
    ['Checking in', 'Scan, and you are marked present.', 'When you arrive, open Check in and scan the code on the screen at the door. That marks you present without queueing at the desk.'],
    ['Forms', 'Baptism, testimony, a first visit.', 'Forms is where you ask for a baptism, share a testimony, or register somebody visiting for the first time. A leader picks it up from there.'],
    ['Your profile', 'Your details, and who can see them.', 'Your profile holds your contact details and your settings, including the language Kairos speaks to you in.'],
  ],
  pastor: [
    ['Your overview', 'Your branch, and what it needs today.', 'Your overview opens on your branch: how many are in the congregation, and what is waiting for you to deal with today.'],
    ['Your branch', 'Everything inside the one you lead.', 'My Branch is the whole of the one you lead. Its members, its groups, its services, and the people who have just joined.'],
    ['The directory', 'Everybody, with their status on the row.', 'The directory lists everybody in your branch. The row tells you whether they are a visitor, a regular, or have completed the membership class.'],
    ['Follow-ups', 'Three queues, on a short clock.', 'Follow-ups has three queues: first-timers nobody has contacted, people in no group, and anybody whose contact is overdue.'],
    ['Concerns', 'Welfare and safeguarding, kept apart.', 'Concerns is where welfare and safeguarding sit. They are two separate inboxes on purpose, read by deliberately different people.'],
    ['Your fellowship', 'The group you lead, and its register.', 'For the fellowship you lead you can take the register, log a follow-up, and see who has stopped coming.'],
    ['Your department', 'Roster, rota and recruitment.', 'For your department you manage the roster, publish the rota, and work through the people applying to join.'],
    ['The souls pipeline', 'From first contact to a department.', 'The souls pipeline tracks somebody reached through evangelism, from first contact through to joining a department.'],
    ['Reports', 'Your branch, in numbers.', 'Reports turns your branch into numbers: attendance trends, who is missing, and how the groups are growing.'],
  ],
  'platform-dashboard': [
    ['Church Pulse', 'The four numbers that matter.', 'Church Pulse is the top of the dashboard: branches, total congregation, confirmed members and fellowships, all at a glance.'],
    ['Needs You', 'The things waiting on you.', 'Needs You lists what is actually waiting: approvals to make, branches without a pastor, anything stuck. Click a row to go straight to it.'],
    ['Recent activity', 'Who joined, and when.', 'Further down, recent activity shows who registered and when, so you can see the week without opening anything else.'],
  ],
  'platform-members': [
    ['The directory', 'Everybody, in one list.', 'Members is the directory. Everybody in the church is here, with their home branch and whether they have done the membership class.'],
    ['Finding somebody', 'Search by name, email or phone.', 'Type a name, an email or a phone number into the search box. You can also filter by branch, by status, or by role.'],
    ['Opening a profile', 'Their whole history, in one place.', 'Clicking a row opens that person: their contact details, their groups, their attendance and every follow-up logged about them.'],
  ],
  'platform-branches': [
    ['Every branch', 'The whole network, listed.', 'Branches lists every location the church runs, its city, its region and how many people are in its congregation.'],
    ['Inside one', 'Settings, leadership and members.', 'Open a branch to set its details, assign its pastor and admins, and see the members, groups and services that belong to it.'],
  ],
  'platform-regions': [
    ['Regions', 'Branches, grouped by geography.', 'Regions group branches geographically, so reports can cover a country or a cluster rather than one location at a time.'],
    ['Branches attached', 'A region with branches cannot be deleted.', 'Each region shows the branches attached to it. One with branches cannot be deleted until every branch is moved or removed.'],
  ],
  'platform-fellowships': [
    ['The fellowships', 'Every small group, and its type.', 'Fellowships lists every small group: K-Groups, Kharis Express, New Breeds and the rest, with who leads it and when it meets.'],
    ['Filtering by type', 'Narrow it to the kind you want.', 'The chips along the top filter by type, and the dropdown narrows to one branch, which matters once there are a few dozen.'],
    ['Finding one on the map', 'The nearest group to a member.', 'Find on the map plots them geographically, which is how you answer the question people actually ask: which one is nearest me.'],
  ],
  'platform-departments': [
    ['Ministry teams', 'Every team, and who leads it.', 'Departments are the ministry teams. Each one shows its lead, its deputy, and how many people serve on it.'],
    ['Inside a department', 'Roster, rota, recruitment, uniform.', 'Open one and you get its roster, its serving rota, the people applying to join, and the uniform for an upcoming service.'],
  ],
  'platform-attendance': [
    ['Services', 'Every gathering, and its register.', 'Attendance lists the services. Each one shows how many were recorded and whether the register is still open.'],
    ['Recording who came', 'The desk, or the member themselves.', 'Open a service to mark people present, late or virtual. Members can also check themselves in with the QR code at the door.'],
  ],
  'platform-membership': [
    ['The class', 'Four weeks, and what it confers.', 'Membership is the four-week class. Completing it is what formally makes somebody a Member, however long they have been attending.'],
    ['Cohorts', 'Intakes, marks and graduation.', 'A cohort is one intake. You schedule its four sessions, mark attendance and the final test, and graduate the people who passed.'],
  ],
  'platform-new-believers': [
    ['The pipeline', 'Four sessions, then a department.', 'New Believers is the discipleship track. Four sessions, then integration into a department, with each person visible on the board.'],
    ['Sessions', 'Scheduled, taught and registered.', 'Sessions are scheduled per branch with a teacher and a date. Take the register in the session, then advance people to the next stage.'],
  ],
  'platform-follow-ups': [
    ['The queues', 'First-timers, no group, and overdue.', 'Follow-ups has three queues: first-timers nobody has contacted yet, people in no group at all, and contacts that are now overdue.'],
    ['Logging one', 'Who, how, and what happens next.', 'Logging a follow-up records who reached out, how, what happened, and what should happen next. It can be flagged as a concern too.'],
  ],
  'platform-concerns': [
    ['Welfare and safeguarding', 'Two inboxes, deliberately separate.', 'Concerns holds two inboxes. Welfare and safeguarding are kept apart on purpose, and read by deliberately different people.'],
    ['Reading one', 'The record, and who raised it.', 'Opening a concern shows the follow-up it came from, who raised it, and what has been done about it since.'],
  ],
  'platform-outreach': [
    ['Programmes', 'Evangelism, with a date and a place.', 'Outreach programmes are the evangelism events: where, when, and which workers are going out.'],
    ['Capturing a soul', 'A name and a number is enough.', 'During an outreach you capture the people you meet. A name and a phone number is enough to start; the pipeline takes it from there.'],
  ],
  'platform-forms': [
    ['The forms', 'Six, for the things people ask for.', 'Forms covers a first-time visit, baptism, a testimony, baby naming, baby dedication and the New Believers class.'],
    ['Filling one in', 'It reaches the right person.', 'Fill one in and it lands with whoever handles it, with the person linked to their record if they already have one.'],
  ],
  'platform-souls-pipeline': [
    ['The board', 'New, following up, converted.', 'The souls pipeline is a board. Somebody moves from new, to following up, to converted, and the colour shows how overdue their contact is.'],
    ['Moving somebody along', 'Drag, or open and update.', 'Drag a card to the next lane, or open it to record what happened and set the next follow-up date.'],
  ],
  'platform-souls-dashboard': [
    ['The numbers', 'How the pipeline is doing.', 'The souls dashboard turns the pipeline into numbers: how many at each stage, how many converted, and how fresh the follow-ups are.'],
    ['By status', 'Click a bar to see who.', 'The charts break it down by status and by urgency. Click any bar to see exactly which people it is counting.'],
  ],
  'platform-profile': [
    ['Your details', 'Your contact information.', 'Your profile holds your contact details, your home branch, and the roles you have been given across the church.'],
    ['Your settings', 'Security, notifications, language.', 'Settings covers your password and sign-in methods, which notifications you get, and the language Kairos speaks to you in.'],
  ],
  'church-management-member-lifecycle': [
    ['From visitor to member', 'Four stages, one list.', 'Everybody sits somewhere on the same journey: visitor, returner, then member once the four-week class is done.'],
    ['Where status shows', 'On the row, and on the profile.', 'The directory row shows which stage somebody is at, so you can see at a glance who has never been followed up.'],
  ],
  'church-management-attendance-tracking': [
    ['Taking a register', 'At the desk, as people arrive.', 'Open the service and mark people present, late or virtual as they arrive. Absence is inferred, so there is nothing to mark for it.'],
    ['Self check-in', 'A QR code at the door.', 'Members can scan the code at the door and mark themselves present, which keeps the desk free for the people who need it.'],
  ],
  'church-management-fellowship-management': [
    ['Running a fellowship', 'Your group, your register.', 'If you lead a fellowship you manage its members, record each meeting, and see who has quietly stopped coming.'],
    ['Its meetings', 'A roll call per meeting.', 'Each meeting gets its own roll call. Over a few weeks that becomes the attendance pattern the reports read from.'],
  ],
  'church-management-branch-management': [
    ['Branch settings', 'Details, schedule, check-in.', 'A branch carries its address, its service schedule, and whether self check-in is on and for how long around the service.'],
    ['Who leads it', 'Pastor, ministers, admins.', 'Leadership is assigned here: the main pastor, any ministers, and the branch admins who can manage its data.'],
  ],
  'church-management-reporting': [
    ['What is reported', 'Attendance, growth, engagement.', 'Reports cover attendance trends, membership growth, engagement and outreach, each scoped to what your role can see.'],
    ['Changing the window', 'The last month, or the last year.', 'Change the window to widen or narrow the period. The numbers and every chart follow it.'],
  ],
  'church-management-department-administration': [
    ['Rosters and rotas', 'Who serves, and when.', 'A department keeps a roster of who serves on it and a rota of who serves when, published a few weeks ahead.'],
    ['Recruitment', 'Apply, interview, probation.', 'Recruitment runs from application through interview and offer to probation, with each candidate visible at their stage.'],
  ],
  'administration-permissions': [
    ['Grants, not job titles', 'A role, pinned to a scope.', 'Permissions come from grants: a named role pinned to one branch, one fellowship, one department, or the whole church.'],
    ['Assigning one', 'Give it, and it takes effect at once.', 'Assign a grant and that person sees the extra sections immediately. Remove it and they stop, with their history intact.'],
  ],
  'administration-capabilities': [
    ['What a capability is', 'The thing a grant actually confers.', 'A grant is a bundle of capabilities. A capability is the single thing it lets you do, like reading a branch or writing to a department.'],
    ['Where they bite', 'Every page checks them.', 'Every page and every action checks a capability, which is why two people with different grants see genuinely different screens.'],
  ],
  'administration-approvals': [
    ['The queue', 'People waiting to be let in.', 'The approval queue holds everybody who has registered but not yet been approved. Until they are, they cannot sign in.'],
    ['Approving somebody', 'Check the branch, then approve.', 'Check the branch they have chosen and the details they gave, then approve. They can sign in from that moment.'],
  ],
  'administration-settings': [
    ['Your settings', 'Account, security, appearance.', 'Settings covers your account, your sign-in methods, how Kairos looks, and which language it speaks to you in.'],
    ['Notifications', 'What reaches you, and how often.', 'Notifications are per category. Choose immediate or a daily digest for each, or turn one off entirely. Security alerts always arrive.'],
  ],
  'analytics-church-health': [
    ['Is the church healthy', 'Attendance against the roll.', 'Church health compares who actually attends against who is on the roll, which is a harder and more useful number than either alone.'],
    ['Reading the trend', 'The direction matters more.', 'A single week says little. The trend over eight weeks is what tells you whether something is working.'],
  ],
  'analytics-engagement': [
    ['Who is engaged', 'More than just turning up.', 'Engagement counts more than attendance: whether somebody is in a group, serving on a team, and being followed up.'],
    ['The engagement view', 'Where people are falling out.', 'The breakdown shows where people disengage, which is usually before they stop attending rather than after.'],
  ],
  'analytics-growth-reports': [
    ['Growth', 'New members, over time.', 'Growth reports count new members over the period, where they joined, and how that compares with the months before.'],
    ['New members', 'Where they came from.', 'The breakdown shows which branch and which route they came through, so you can see what is actually bringing people in.'],
  ],
  'analytics-attendance-reports': [
    ['Attendance reports', 'Per week, per branch.', 'Attendance reports show check-ins per week against distinct members, which separates the same people coming often from more people coming.'],
    ['Who is missing', 'Sorted by how long.', 'The missing members list is sorted by how many services somebody has missed in a row, which is the list pastoral care actually needs.'],
  ],
  'getting-started-your-first-church': [
    ['Setting up', 'Regions, then branches.', 'Setting up starts with regions, then the branches inside them, because every member and every group belongs to a branch.'],
    ['Your first branch', 'Name it, place it, lead it.', 'Give the branch a name, a city and a service schedule, then assign its pastor. Members can be added or imported after that.'],
  ],
  'getting-started-roles-permissions': [
    ['Who can do what', 'Two system roles, many grants.', 'Kairos stores only two system roles, admin and member. Everything else is a grant: a named role pinned to a specific scope.'],
    ['Seeing it on an account', 'Open the person, read the grants.', 'Open somebody and you can see every grant they hold and where it applies, which is the honest answer to why they can see a page.'],
  ],
};
