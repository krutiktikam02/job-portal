"use client"
import {
  Briefcase,
  Users,
  Target,
  CheckCircle,
  Search,
  MessageSquare,
  BarChart3,
  ArrowRight,
  Clock,
  Shield,
  Zap,
  TrendingUp,
} from "lucide-react"

const PostingLanding = () => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white py-20">
        <div className="w-full">
          <div className="flex justify-center items-center">
            <div className="max-w-4xl text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-700 mb-6 text-balance">
                Manage Your Hiring From
                <br />
                <span className="text-blue-800">Start To Finish</span>
              </h1>

              <p className="text-lg text-gray-600 mb-8 text-pretty">
                Get started with a job post.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <button className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors inline-flex items-center justify-center space-x-2">
                  <Briefcase className="w-5 h-5" />
                  <a href="/posting-job"><span>Post a Job</span></a>
                </button>
                
              </div>

              
            </div>
          </div>
        </div>
      </section>

      {/* Hiring Process Steps */}
      <section className="py-16 bg-white">
        <div className="w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-700 mb-4">Your Complete Hiring Solution</h2>
            <p className="text-lg text-gray-600">Everything you need to find and hire the best talent</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Briefcase className="w-8 h-8 text-blue-800" />,
                title: "Post a Job",
                description: "Get started with a job post. Reach millions of qualified candidates instantly.",
              },
              {
                icon: <Search className="w-8 h-8 text-blue-800" />,
                title: "Find Quality Applicants",
                description: "Customise your post with screening tools to help narrow down to potential candidates.",
              },
              {
                icon: <MessageSquare className="w-8 h-8 text-blue-800" />,
                title: "Make Connections",
                description: "Track, message, invite, and interview directly on Indeed and with the mobile app.",
              },
              {
                icon: <CheckCircle className="w-8 h-8 text-blue-800" />,
                title: "Hire Confidently",
                description: "You're not alone on your hiring journey. We have helpful resources for every step.",
              },
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg">{step.icon}</div>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Features */}
      <section className="py-16 bg-blue-50">
        <div className="w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-700 mb-4">Your Dashboard Features</h2>
            <p className="text-lg text-gray-600">Powerful tools to streamline your hiring process</p>
          </div>

          <div className="space-y-8">
            <div className="flex items-start space-x-4 max-w-4xl mx-auto">
              <div className="p-2 bg-blue-800 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Manage Your Jobs</h3>
                <p className="text-gray-600">
                  Your dashboard helps you keep up with your hiring priorities. Manage open jobs, update job statuses
                  and filter applications easily.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 max-w-4xl mx-auto">
              <div className="p-2 bg-blue-800 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Choose Who Moves Forward</h3>
                <p className="text-gray-600">
                  Interview anywhere with our integrated video calling feature. Schedule and conduct interviews
                  seamlessly.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 max-w-4xl mx-auto">
              <div className="p-2 bg-blue-800 rounded-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Smart Candidate Matching</h3>
                <p className="text-gray-600">
                  Our AI-powered system matches your job requirements with the most qualified candidates automatically.
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto text-center mt-16">
            <div className="p-8 rounded-lg border border-gray-200 bg-white">
              <Target className="w-12 h-12 text-blue-800 mb-4 mx-auto" />
              <h3 className="text-2xl font-bold text-gray-700 mb-4">Ready to Get Started?</h3>
              <p className="text-gray-600 mb-6">
                Join thousands of companies who have found their perfect candidates through our platform.
              </p>
              <button className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-flex items-center space-x-2">
                <a href="/posting-job"><span>Get Started</span></a>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-white">
        <div className="w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-700 mb-4">Why Employers Choose Us</h2>
            <p className="text-lg text-gray-600">Join thousands of companies that trust our platform</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Clock className="w-8 h-8 text-blue-800" />,
                title: "Save Time",
                description: "Automated screening and smart matching reduce time-to-hire by 60%",
              },
              {
                icon: <Shield className="w-8 h-8 text-blue-800" />,
                title: "Verified Candidates",
                description: "All candidates are verified with background checks and skill assessments",
              },
              {
                icon: <Zap className="w-8 h-8 text-blue-800" />,
                title: "Instant Results",
                description: "Get qualified applications within 24 hours of posting your job",
              },
              {
                icon: <TrendingUp className="w-8 h-8 text-blue-800" />,
                title: "Better Matches",
                description: "AI-powered matching ensures 85% higher candidate-job fit rate",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg">{feature.icon}</div>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}

export default PostingLanding