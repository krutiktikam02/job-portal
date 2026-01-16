import { Link } from "react-router-dom"
import { Facebook, Linkedin, Instagram } from "lucide-react"

const Footer = () => {
  return (
    <footer className="bg-blue-50 border-t border-gray-200">
      <div className="w-full py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-1">
            {/* Social Media Icons */}
            <div className="flex space-x-3 mb-4">
              <Link to="#" className="text-gray-600 hover:text-blue-800 transition-colors">
                <Facebook className="w-6 h-6" />
              </Link>
              <Link to="#" className="text-gray-600 hover:text-blue-800 transition-colors">
                <Linkedin className="w-6 h-6" />
              </Link>
              <Link to="#" className="text-gray-600 hover:text-blue-800 transition-colors">
                <Instagram className="w-6 h-6" />
              </Link>
            </div>
            <p className="text-gray-600 text-sm mb-4">Connecting people with opportunities they love.</p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-4">Product</h3>
            <div className="space-y-2">
              <Link to="/jobs" className="block text-gray-600 hover:text-blue-800 transition-colors text-sm">
                Jobs
              </Link>
              <Link to="/employers" className="block text-gray-600 hover:text-blue-800 transition-colors text-sm">
                Employers
              </Link>
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-4">Company</h3>
            <div className="space-y-2">
              <Link to="/about" className="block text-gray-600 hover:text-blue-800 transition-colors text-sm">
                About
              </Link>
              <Link to="/contact" className="block text-gray-600 hover:text-blue-800 transition-colors text-sm">
                Contact Us
              </Link>
              <Link to="/help" className="block text-gray-600 hover:text-blue-800 transition-colors text-sm">
                Help
              </Link>
            </div>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-4">Legal</h3>
            <div className="space-y-2">
              <Link to="/privacy" className="block text-gray-600 hover:text-blue-800 transition-colors text-sm">
                Privacy
              </Link>
              <Link to="/terms" className="block text-gray-600 hover:text-blue-800 transition-colors text-sm">
                Terms
              </Link>
              <Link to="/cookies" className="block text-gray-600 hover:text-blue-800 transition-colors text-sm">
                Cookies
              </Link>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <p className="text-gray-600 text-sm">© 2025 JobPortal. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
