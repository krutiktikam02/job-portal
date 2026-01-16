"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import { Search, MapPin, CheckCircle, Users, Zap, Target, ArrowRight } from "lucide-react"

const LandingPage = () => {
  const [skills, setSkills] = useState("")
  const [experience, setExperience] = useState("")
  const [location, setLocation] = useState("")

  const handleSearch = () => {
    console.log("Searching for:", { skills, experience, location })
  }

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white py-20">
        <div className="w-full">
          <div className="flex justify-center items-center">
            {/* Content - now centered and single column */}
            <div className="max-w-4xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-700 mb-6 text-balance text-center">
                Find Your Dream Job.
                <br />
                <span className="text-blue-800">Hire the Right Talent.</span>
              </h1>

              <p className="text-lg text-gray-600 mb-8 text-pretty text-center">
                We connect ambitious professionals with forward-thinking companies using smart recommendations.
              </p>

              {/* Search Interface */}
              <div className="bg-blue-50 p-6 rounded-lg shadow-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Skills Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-4 h-4" />
                    <input
                      placeholder="Skills/Designations"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Experience Select */}
                  <select
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Experience</option>
                    <option value="0-1">0-1 years</option>
                    <option value="1-3">1-3 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="5-10">5-10 years</option>
                    <option value="10+">10+ years</option>
                  </select>

                  {/* Location Input */}
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-4 h-4" />
                    <input
                      placeholder="Enter Location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <Link to="/login">
                <button
                  className="w-full bg-blue-800 hover:bg-blue-900 text-white py-3 rounded-lg font-semibold transition-colors">
                  <span>Search Jobs</span>
                </button>
              </Link>
                

                {/* Quick Suggestions */}
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  <span className="text-sm text-gray-600">Try:</span>
                  {["React", "Data Analyst", "Product Manager"].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setSkills(suggestion)}
                      className="text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 px-3 py-1 rounded-full border border-blue-200 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Get Started Section */}
      <section className="py-16 bg-white">
        <div className="w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-700 mb-4">Get Started with Us</h2>
            <p className="text-lg text-gray-600">Everything you need to find your perfect job</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Search className="w-8 h-8 text-blue-800" />,
                title: "Find and Apply to Jobs",
                description: "Browse thousands of job opportunities from top companies",
              },
              {
                icon: <CheckCircle className="w-8 h-8 text-blue-800" />,
                title: "Verified Companies",
                description: "All companies are verified and trusted by our platform",
              },
              {
                icon: <Zap className="w-8 h-8 text-blue-800" />,
                title: "Instant Applications",
                description: "Apply to jobs with just one click using your profile",
              },
              {
                icon: <Users className="w-8 h-8 text-blue-800" />,
                title: "Realtime Updates",
                description: "Get instant notifications about your application status",
              },
            ].map((feature, index) => (
              <div key={index} className="text-center">
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

      {/* How It Works Section */}
      <section className="py-16 bg-blue-50">
        <div className="w-full">
          {/* How It Works Steps */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-700 mb-8">How It Works</h2>
          </div>

          <div className="max-w-4xl mx-auto mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  step: "1",
                  title: "Create Profile",
                  description: "Build your professional profile with skills, experience, and preferences",
                },
                {
                  step: "2",
                  title: "Discover Opportunities",
                  description: "Browse personalized job recommendations based on your profile",
                },
                {
                  step: "3",
                  title: "Apply and Track",
                  description: "Apply to jobs instantly and track your application progress",
                },
                {
                  step: "4",
                  title: "Land Your Dream Job",
                  description: "Connect with employers and secure your ideal position",
                },
              ].map((step, index) => (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 bg-blue-800 text-white rounded-full flex items-center justify-center font-semibold text-lg">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ready to Get Started - Now Below How It Works */}
          <div className="max-w-2xl mx-auto text-center">
            <div className="p-8 rounded-lg border border-gray-200 bg-white">
              <Target className="w-12 h-12 text-blue-800 mb-4 mx-auto" />
              <h3 className="text-2xl font-bold text-gray-700 mb-4">Ready to Get Started?</h3>
              <p className="text-gray-600 mb-6">
                Join thousands of professionals who have found their dream jobs through our platform.
              </p>
              <Link to="/login">
                <button className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-flex items-center space-x-2">
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Browse Categories Section */}
      <section className="py-16 bg-white">
        <div className="w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-700 mb-4">Browse by Category</h2>
            <Link to="/categories" className="text-blue-800 hover:underline font-medium block">
              View all
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "💻", title: "IT & Software", link: "/categories/it-software" },
              { icon: "🎨", title: "Design & Creative", link: "/categories/design-creative" },
              { icon: "💼", title: "Business & Finance", link: "/categories/business-finance" },
              { icon: "🏥", title: "Healthcare", link: "/categories/healthcare" },
              { icon: "📚", title: "Education", link: "/categories/education" },
              { icon: "🔧", title: "Skilled Trades", link: "/categories/skilled-trades" },
            ].map((category, index) => (
              <div
                key={index}
                className="bg-blue-50 rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{category.icon}</span>
                    <h3 className="text-lg font-semibold text-gray-700">{category.title}</h3>
                  </div>
                  <Link to={category.link} className="text-blue-800 hover:text-blue-900 font-medium">
                    Explore
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default LandingPage