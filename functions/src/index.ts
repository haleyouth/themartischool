import { initializeApp } from 'firebase-admin/app'
import { setGlobalOptions } from 'firebase-functions/v2'

initializeApp()

// Keep a lid on cost: this is a weekend school, not a high-traffic service.
setGlobalOptions({ region: 'us-central1', maxInstances: 10 })

export { approveRegistration, rejectRegistration, onRegistrationCreated } from './registrations'

export {
  createStaffUser,
  setUserRole,
  setUserStatus,
  adminResetStudentPassword,
  requestStudentPasswordReset,
  changeMyPassword,
} from './users'

export {
  createStudent,
  updateStudent,
  deleteStudent,
  restoreStudent,
} from './students'

export { onAttendanceWrite } from './attendance'

export {
  enrollStudent,
  unenrollStudent,
  assignTeacherToClass,
  generateSessionDates,
  publishPerformanceReport,
  createConversation,
  sendAnnouncement,
  onMessageCreate,
} from './school'
