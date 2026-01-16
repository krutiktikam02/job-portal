import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import "./App.css"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import LandingPage from "./components/LandingPage"
import Login from "./components/Login"
import Signup from "./components/Signup"
import AuthGuard from "./components/AuthGuard"
import Profile from "./components/Profile"

import UserAccomplishments from "./components/UserAccomplishments"
import UserEducations from "./components/UserEducations"
import UserEmployments from "./components/UserEmployments"
import UserInternships from "./components/UserInternships"
import UserLanguages from "./components/UserLanguages"
import UserProjects from "./components/UserProjects"
import UserSkills from "./components/UserSkills"

import Settings from "./components/Settings"
import MyJobs from "./components/MyJobs"
import Jobs from "./components/Jobs"
import PostingLanding from "./components/PostingLanding"
import PostJobs from "./components/PostJobs"
import PostingDashboard from "./components/PostingDashboard"
import PostingProfile from "./components/PostingProfile"
import FindCandidate from "./components/FindCandidate"
import SavedCandidates from "./components/SavedCandidates"
// import AdvanceSearchCandidate from "./components/AdvanceSearchCandidate"
import ActiveJobs from "./components/ActiveJobs"
import Applicants from "./components/Applicants"
import ScheduleInterview from "./components/ScheduleInterview"
import HireNumber from "./components/HireNumber"
import PosterMessage from "./components/PosterMessage"
import ApplicantMessage from "./components/ApplicantMessage"
import ViewAnalytics from "./components/ViewAnalytics"

// import RecommendedJobs from "./components/RecommendedJobs";


function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/post-job" element={<PostingLanding />} />

        <Route element={<AuthGuard />}>
          {/* Job Seeker specific routes */}
          <Route path="/profile" element={<Profile />} />

          <Route path="/education" element={<UserEducations />} />
          <Route path="/projects" element={<UserProjects />} />
          <Route path="/internships" element={<UserInternships />} />
          <Route path="/employment" element={<UserEmployments />} />
          <Route path="/skills" element={<UserSkills />} />
          <Route path="/languages" element={<UserLanguages />} />
          <Route path="/accomplishments" element={<UserAccomplishments />} />
          <Route path="/applicant-messages" element={<ApplicantMessage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/my-jobs" element={<MyJobs />} />
          <Route path="/jobs" element={<Jobs />} />
          {/* <Route path="/recommended-jobs" element={<RecommendedJobs />} /> */}

          <Route path="/poster-profile" element={<PostingProfile />} />
          <Route path="/posting-job" element={<PostJobs />} />
          <Route path="/active-jobs" element={<ActiveJobs />} />
          <Route path="/applicants" element={<Applicants />} />
          <Route path="/schedule-interview" element={<ScheduleInterview />} />
          <Route path="/hire-number" element={<HireNumber />} />
          <Route path="/poster-message" element={<PosterMessage />} />
          <Route path="/view-analytics" element={<ViewAnalytics />} />
          <Route path="/poster-settings" element={<Settings />} />
          <Route path="/poster-dashboard" element={<PostingDashboard />} />
          <Route path="/find-candidate" element={<FindCandidate />} />
          <Route path="/saved-candidates" element={<SavedCandidates />} />
          {/* <Route path="/find-candidate" element={<AdvanceSearchCandidate />} /> */}

        </Route>
      </Routes>
      <Footer />
    </Router>
  )
}

export default App